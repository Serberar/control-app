import { IUserRepository } from '../../../domain/ports/repositories/IUserRepository'
import { IAuthService, TokenPair } from '../../../domain/ports/services/IAuthService'
import { Result } from '../../../shared/types/Result'
import { UnauthorizedError } from '../../../shared/errors/DomainError'

interface LoginInput {
  email: string
  password: string
}

interface LoginOutput {
  tokens: TokenPair
  user: {
    id: string
    email: string
    name: string
  }
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authService: IAuthService,
  ) {}

  async execute(input: LoginInput): Promise<Result<LoginOutput, UnauthorizedError>> {
    const user = await this.userRepository.findByEmail(input.email)
    if (!user) {
      return Result.fail(new UnauthorizedError('Credenciales incorrectas'))
    }

    const passwordValid = await this.authService.comparePassword(input.password, user.passwordHash)
    if (!passwordValid) {
      return Result.fail(new UnauthorizedError('Credenciales incorrectas'))
    }

    const tokens = this.authService.generateTokenPair({
      userId: user.id,
      email: user.email,
    })

    return Result.ok({
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  }
}
