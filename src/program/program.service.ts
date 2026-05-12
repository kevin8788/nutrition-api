import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnthropicService } from '../anthropic/anthropic.service';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateProgramDto } from './dto/generate-program.dto';

interface RawSession {
  day_number: number;
  week_number: number;
  day_of_week: number;
  type: 'walk' | 'rest' | 'light';
  duration_minutes: number | null;
  distance_km: number | null;
  intensity: 'low' | 'moderate' | 'high' | null;
  title: string;
  description: string;
  tips: string[];
}

@Injectable()
export class ProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  async generate(userId: string, dto: GenerateProgramDto) {
    const id = BigInt(userId);

    const profile = await this.prisma.user_profile.findFirst({
      where: { user_id: id },
    });
    if (!profile) {
      throw new BadRequestException(
        'Complete your fitness profile before generating a program',
      );
    }

    // Cancel any existing active program
    await this.prisma.training_program.updateMany({
      where: { user_id: id, status: 'active' },
      data: { status: 'cancelled' },
    });

    const sessions = await this.generateWithAI(profile, dto.duration_weeks);

    const startsAt = new Date();
    startsAt.setHours(0, 0, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + dto.duration_weeks * 7 - 1);

    const program = await this.prisma.training_program.create({
      data: {
        user_id: id,
        duration_weeks: dto.duration_weeks,
        status: 'active',
        starts_at: startsAt,
        ends_at: endsAt,
        sessions: {
          create: sessions.map((s) => ({
            day_number: s.day_number,
            week_number: s.week_number,
            day_of_week: s.day_of_week,
            session_date: this.addDays(startsAt, s.day_number - 1),
            type: s.type,
            duration_minutes: s.duration_minutes,
            distance_km: s.distance_km,
            intensity: s.intensity,
            title: s.title,
            description: s.description,
            tips: s.tips,
          })),
        },
      },
      include: { sessions: { orderBy: { day_number: 'asc' } } },
    });

    return this.formatProgram(program, startsAt);
  }

  async getActive(userId: string) {
    const id = BigInt(userId);

    const program = await this.prisma.training_program.findFirst({
      where: { user_id: id, status: 'active' },
      include: { sessions: { orderBy: { day_number: 'asc' } } },
    });

    if (!program) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySession = program.sessions.find(
      (s) => new Date(s.session_date).getTime() === today.getTime(),
    ) ?? null;

    return {
      ...this.formatProgram(program, new Date(program.starts_at)),
      today_session: todaySession ? this.formatSession(todaySession) : null,
    };
  }

  async getWeek(userId: string, weekNumber: number) {
    const id = BigInt(userId);

    const program = await this.prisma.training_program.findFirst({
      where: { user_id: id, status: 'active' },
    });

    if (!program) throw new NotFoundException('No active program found');

    if (weekNumber < 1 || weekNumber > program.duration_weeks) {
      throw new BadRequestException(
        `Week must be between 1 and ${program.duration_weeks}`,
      );
    }

    const sessions = await this.prisma.training_session.findMany({
      where: { program_id: program.id, week_number: weekNumber },
      orderBy: { day_number: 'asc' },
    });

    return {
      week_number: weekNumber,
      duration_weeks: program.duration_weeks,
      sessions: sessions.map(this.formatSession),
    };
  }

  async completeSession(userId: string, sessionId: string) {
    const id = BigInt(userId);
    const sId = BigInt(sessionId);

    const session = await this.prisma.training_session.findUnique({
      where: { id: sId },
      include: { program: true },
    });

    if (!session || session.program.user_id !== id) {
      throw new NotFoundException('Session not found');
    }

    const updated = await this.prisma.training_session.update({
      where: { id: sId },
      data: { completed: true, completed_at: new Date() },
    });

    return this.formatSession(updated);
  }

  async listPrograms(userId: string) {
    const id = BigInt(userId);

    const programs = await this.prisma.training_program.findMany({
      where: { user_id: id },
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { sessions: true } },
      },
    });

    return programs.map((p) => ({
      id: p.id.toString(),
      duration_weeks: p.duration_weeks,
      status: p.status,
      starts_at: p.starts_at,
      ends_at: p.ends_at,
      created_at: p.created_at,
      total_sessions: p._count.sessions,
    }));
  }

  // ─── AI Generation ────────────────────────────────────────────────────────

  private async generateWithAI(profile: any, durationWeeks: number): Promise<RawSession[]> {
    const totalDays = durationWeeks * 7;
    const daysPerWeek = profile.days_per_week ?? 3;

    const prompt = this.buildPrompt(profile, durationWeeks, totalDays, daysPerWeek);

    const raw = await this.anthropic.generateText(prompt, 8096);

    return this.parseSessions(raw, totalDays);
  }

  private buildPrompt(
    profile: any,
    durationWeeks: number,
    totalDays: number,
    daysPerWeek: number,
  ): string {
    const profileLines = [
      profile.weight ? `- Peso: ${profile.weight} kg` : null,
      profile.height ? `- Altura: ${profile.height} cm` : null,
      profile.activity_level ? `- Nivel de actividad actual: ${profile.activity_level}` : null,
      profile.daily_walking_minutes
        ? `- Minutos caminando al día actualmente: ${profile.daily_walking_minutes}`
        : null,
      profile.has_run_before != null
        ? `- Ha corrido antes: ${profile.has_run_before ? 'sí' : 'no'}`
        : null,
      `- Días disponibles por semana: ${daysPerWeek}`,
      profile.preferred_location
        ? `- Lugar preferido: ${profile.preferred_location}`
        : null,
      profile.goal_type ? `- Objetivo: ${profile.goal_type}` : null,
      profile.intensity_preference
        ? `- Preferencia de intensidad: ${profile.intensity_preference}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    return `Eres un entrenador de caminata certificado. Crea un programa de caminata personalizado de ${durationWeeks} semanas.

Perfil del usuario:
${profileLines}

Devuelve SOLO un JSON array con exactamente ${totalDays} objetos (uno por cada día del programa), sin texto adicional ni markdown.

Cada objeto debe tener exactamente estas propiedades:
{
  "day_number": número del 1 al ${totalDays},
  "week_number": número del 1 al ${durationWeeks},
  "day_of_week": número del 0 (domingo) al 6 (sábado), empezando en 1 (lunes) para day_number=1,
  "type": "walk" | "rest" | "light",
  "duration_minutes": número entero o null si es descanso,
  "distance_km": número decimal o null si es descanso,
  "intensity": "low" | "moderate" | "high" o null si es descanso,
  "title": título corto de la sesión en español,
  "description": descripción motivadora de 1-2 oraciones en español,
  "tips": array de 1-3 consejos prácticos en español
}

Reglas:
- Exactamente ${daysPerWeek} días activos (type "walk") por semana; el resto son "rest" o "light" (estiramiento suave)
- Progresión gradual: las primeras semanas son más suaves y van aumentando duración e intensidad
- Los días "light" incluyen estiramientos de 10-15 min, distance_km=null
- Adapta el programa al objetivo "${profile.goal_type ?? 'maintain'}"
- Empieza semana ${durationWeeks > 4 ? 'con precaución' : 'a buen ritmo'}
- Los consejos deben ser concretos y aplicables`;
  }

  private parseSessions(raw: string, expectedDays: number): RawSession[] {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new BadRequestException('Failed to generate program, please try again');

    let sessions: RawSession[];
    try {
      sessions = JSON.parse(match[0]);
    } catch {
      throw new BadRequestException('Failed to parse program, please try again');
    }

    if (!Array.isArray(sessions) || sessions.length < expectedDays * 0.9) {
      throw new BadRequestException('Incomplete program generated, please try again');
    }

    return sessions.slice(0, expectedDays);
  }

  // ─── Formatters ───────────────────────────────────────────────────────────

  private formatProgram(program: any, startsAt: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSinceStart = Math.floor(
      (today.getTime() - startsAt.getTime()) / 86400000,
    );
    const currentWeek = Math.min(
      Math.floor(daysSinceStart / 7) + 1,
      program.duration_weeks,
    );

    const totalSessions = program.sessions?.filter((s: any) => s.type === 'walk').length ?? 0;
    const completedSessions = program.sessions?.filter(
      (s: any) => s.type === 'walk' && s.completed,
    ).length ?? 0;

    return {
      id: program.id.toString(),
      duration_weeks: program.duration_weeks,
      status: program.status,
      starts_at: program.starts_at,
      ends_at: program.ends_at,
      current_week: currentWeek,
      progress: {
        completed_sessions: completedSessions,
        total_sessions: totalSessions,
        percentage: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
      },
    };
  }

  private formatSession = (s: any) => ({
    id: s.id.toString(),
    day_number: s.day_number,
    week_number: s.week_number,
    day_of_week: s.day_of_week,
    session_date: s.session_date,
    type: s.type,
    duration_minutes: s.duration_minutes,
    distance_km: s.distance_km,
    intensity: s.intensity,
    title: s.title,
    description: s.description,
    tips: s.tips,
    completed: s.completed,
    completed_at: s.completed_at,
  });

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
