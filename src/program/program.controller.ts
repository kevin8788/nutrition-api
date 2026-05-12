import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateProgramDto } from './dto/generate-program.dto';
import { ProgramService } from './program.service';

@Controller('programs')
@UseGuards(JwtAuthGuard)
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  // Generate a new program (cancels any existing active one)
  @Post('generate')
  generate(
    @CurrentUser() user: { userId: string },
    @Body() dto: GenerateProgramDto,
  ) {
    return this.programService.generate(user.userId, dto);
  }

  // Active program + today's session (main screen)
  @Get('active')
  getActive(@CurrentUser() user: { userId: string }) {
    return this.programService.getActive(user.userId);
  }

  // All sessions for a given week (week view)
  @Get('active/week/:n')
  getWeek(
    @CurrentUser() user: { userId: string },
    @Param('n', ParseIntPipe) weekNumber: number,
  ) {
    return this.programService.getWeek(user.userId, weekNumber);
  }

  // Mark a session as completed
  @Put('sessions/:id/complete')
  completeSession(
    @CurrentUser() user: { userId: string },
    @Param('id') sessionId: string,
  ) {
    return this.programService.completeSession(user.userId, sessionId);
  }

  // History of all programs
  @Get()
  listPrograms(@CurrentUser() user: { userId: string }) {
    return this.programService.listPrograms(user.userId);
  }
}
