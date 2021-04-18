import fs from "fs"
import path from "path"
import { AssetGodotScene } from "../assets/asset_godot_scene"
import { TsGdProjectClass } from "../project"

export function buildAssetPathsType(project: TsGdProjectClass) {
  const assetFileContents = `
declare type AssetType = {
${project.assets
  .filter((obj) => obj.tsType() !== null)
  .map((obj) => `  '${obj.resPath}': ${obj.tsType()}`)
  .join(",\n")}
}

declare type SceneName =
${project.assets
  .filter((obj): obj is AssetGodotScene => obj instanceof AssetGodotScene)
  .map((obj) => `  | '${obj.resPath}'`)
  .join("\n")}

declare type AssetPath = keyof AssetType;
  `

  const destPath = path.join(
    TsGdProjectClass.Paths.dynamicGodotDefsPath,
    "@asset_paths.d.ts"
  )
  fs.writeFileSync(destPath, assetFileContents)
}