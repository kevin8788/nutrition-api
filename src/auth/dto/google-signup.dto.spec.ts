import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GoogleSignupDto } from './google-signup.dto';

describe('GoogleSignupDto', () => {
  it('should pass validation with all required fields', async () => {
    const dto = plainToInstance(GoogleSignupDto, {
      first_name: 'John',
      last_name: 'Doe',
      username: 'johndoe',
      dob: '1990-01-15',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with optional gender', async () => {
    const dto = plainToInstance(GoogleSignupDto, {
      first_name: 'Jane',
      last_name: 'Doe',
      username: 'janedoe',
      dob: '1992-05-20',
      gender: 'female',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if first_name is missing', async () => {
    const dto = plainToInstance(GoogleSignupDto, {
      last_name: 'Doe',
      username: 'johndoe',
      dob: '1990-01-15',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'first_name')).toBe(true);
  });

  it('should fail if dob is not a date string', async () => {
    const dto = plainToInstance(GoogleSignupDto, {
      first_name: 'John',
      last_name: 'Doe',
      username: 'johndoe',
      dob: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dob')).toBe(true);
  });
});
