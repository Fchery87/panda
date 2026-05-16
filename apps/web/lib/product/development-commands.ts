import commandCatalog from '../../../../docs/development-commands.json'

export type DevelopmentCommand = {
  command: string
  label: string
  detail: string
  proof: string
}

export const developmentCommands = commandCatalog.commands satisfies DevelopmentCommand[]

export const recommendedProofLoop = commandCatalog.recommendedProofLoop satisfies string[]
