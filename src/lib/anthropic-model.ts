export function normalizeAnthropicModel(value: string | undefined): string | undefined {
  const model = value?.trim()
  const shorthand = model?.match(/^(?:claude:\s*)?(sonnet|opus|haiku)-?(\d+)(?:[.-](\d+))?$/i)
  if (!shorthand) return model

  const [, family, major, minor] = shorthand
  return `claude-${family.toLowerCase()}-${major}${minor ? `-${minor}` : ''}`
}
