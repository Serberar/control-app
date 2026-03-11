import { IUserRepository } from '../../../domain/ports/repositories/IUserRepository'
import { IAuthService, TokenPair } from '../../../domain/ports/services/IAuthService'
import { Result } from '../../../shared/types/Result'
import { UnauthorizedError, NotFoundError } from '../../../shared/errors/DomainError'

interface RefreshTokenInput {
  refreshToken: string
}

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authService: IAuthService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<Result<TokenPair, UnauthorizedError | NotFoundError>> {
    let payload: { userId: string; email: string }

    try {
      payload = this.authService.verifyRefreshToken(input.refreshToken)
    } catch {
      return Result.fail(new UnauthorizedError('Refresh token inválido o expirado'))
    }

    const user = await this.userRepository.findById(payload.userId)
    if (!user) {
      return Result.fail(new NotFoundError('Usuario'))
    }

    const tokens = this.authService.generateTokenPair({
      userId: user.id,
      email: user.email,
    })

    return Result.ok(tokens)
  }
}
