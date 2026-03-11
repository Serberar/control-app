import { v4 as uuidv4 } from 'uuid'
import { Keyword } from '../../../domain/entities/Keyword'
import { IKeywordRepository } from '../../../domain/ports/repositories/IKeywordRepository'
import { Result } from '../../../shared/types/Result'

export class ManageKeywordsUseCase {
  constructor(private readonly keywordRepository: IKeywordRepository) {}

  async setKeywords(deviceId: string, words: string[]): Promise<Result<void>> {
    const unique = [...new Set(words.map((w) => w.toLowerCase().trim()).filter(Boolean))]
    const keywords = unique.map((word) =>
      Keyword.create({ id: uuidv4(), deviceId, word }),
    )
    await this.keywordRepository.replaceAll(deviceId, keywords)
    return Result.ok(undefined)
  }

  async getKeywords(deviceId: string): Promise<Result<string[]>> {
    const keywords = await this.keywordRepository.findByDevice(deviceId)
    return Result.ok(keywords.map((k) => k.word))
  }

  /**
   * Evalúa un texto contra las palabras clave del dispositivo.
   * Retorna las palabras que coinciden (case-insensitive, palabra completa).
   */
  async evaluate(deviceId: string, text: string): Promise<string[]> {
    const keywords = await this.keywordRepository.findByDevice(deviceId)
    if (keywords.length === 0) return []

    const lower = text.toLowerCase()
    return keywords
      .filter((k) => lower.includes(k.word))
      .map((k) => k.word)
  }
}
