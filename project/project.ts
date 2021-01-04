import chokidar from "chokidar"
import path from "path"
import ts from "typescript"

import { AssetGodotClass as GodotFile } from "./asset_godot_class"
import { AssetGodotScene } from "./asset_godot_scene"
import { AssetFont } from "./asset_font"
import { AssetSourceFile } from "./asset_source_file"
import { GodotProjectFile } from "./godot_project_file"
import { TsGdJson } from "./tsgd_json"
import { BaseAsset } from "./base_asset"
import { buildNodePathsTypeForScript } from "../build_paths_for_node"
import { buildSceneImports } from "../build_scene_imports"
import { generateGodotLibraryDefinitions } from "../generate_library"
import { buildAssetPathsType } from "../build_asset_paths"
import { buildGroupTypes } from "../build_group_types"

// TODO: Instead of manually scanning to find all assets, i could just import
// all godot files, and then parse them for all their asset types. It would
// probably be easier to find the tscn and tres files.

export class TsGdProjectClass {
  /**
   * Path to the directory that contains the tsgd.json file.
   *
   * @example /Users/johnfn/GodotProject/
   */
  static tsgdPath: string

  /**
   * Path to the the tsgd.json file.
   *
   * @example /Users/johnfn/GodotProject/tsgd.json
   */
  static tsgdPathWithFilename: string

  /** Parsed tsgd.json file. */
  tsgdJson: TsGdJson

  /** Master list of all Godot assets */
  assets: BaseAsset[] = []

  /** Parsed project.godot file. */
  godotProject!: GodotProjectFile

  /** Info about each source file. */
  sourceFiles(): AssetSourceFile[] {
    return this.assets.filter(
      (a): a is AssetSourceFile => a instanceof AssetSourceFile
    )
  }

  /** Info about each Godot class. */
  godotClasses(): GodotFile[] {
    return this.assets.filter((a): a is GodotFile => a instanceof GodotFile)
  }

  /** Info about each Godot scene. */
  godotScenes(): AssetGodotScene[] {
    return this.assets.filter(
      (a): a is AssetGodotScene => a instanceof AssetGodotScene
    )
  }

  /** Info about each Godot font. */
  godotFonts(): AssetFont[] {
    return this.assets.filter((a): a is AssetFont => a instanceof AssetFont)
  }

  mainScene: AssetGodotScene

  godotDefsPath: string

  program: ts.WatchOfConfigFile<ts.EmitAndSemanticDiagnosticsBuilderProgram>

  constructor(
    watcher: chokidar.FSWatcher,
    initialFilePaths: string[],
    program: ts.WatchOfConfigFile<ts.EmitAndSemanticDiagnosticsBuilderProgram>,
    tsgdPath: string,
    tsgdPathWithFilename: string
  ) {
    // Initial set up

    TsGdProjectClass.tsgdPath = tsgdPath
    TsGdProjectClass.tsgdPathWithFilename = tsgdPathWithFilename
    this.tsgdJson = new TsGdJson()
    this.program = program
    this.godotDefsPath = path.join(tsgdPath, "godot_defs")

    // Parse assets

    const initialAssets = initialFilePaths.map((path) => this.getAsset(path))

    for (const asset of initialAssets) {
      if (asset === null) {
        continue
      }

      if (asset instanceof BaseAsset) {
        this.assets.push(asset)
      }

      if (asset instanceof GodotProjectFile) {
        this.godotProject = asset
      }
    }

    this.mainScene = this.godotScenes().find(
      (scene) => scene.resPath === this.godotProject.mainScene.resPath
    )!

    this.monitor(watcher)
  }

  getAsset(
    path: string
  ):
    | AssetSourceFile
    | GodotFile
    | AssetGodotScene
    | AssetFont
    | GodotProjectFile
    | null {
    if (path.endsWith(".ts")) {
      return new AssetSourceFile(path, this)
    } else if (path.endsWith(".gd")) {
      return new GodotFile(path, this)
    } else if (path.endsWith(".tscn")) {
      return new AssetGodotScene(path, this)
    } else if (path.endsWith(".godot")) {
      return new GodotProjectFile(path)
    } else if (path.endsWith(".ttf")) {
      return new AssetFont(path, this)
    }

    throw new Error(`unhandled asset type ${path}`)
  }

  monitor(watcher: chokidar.FSWatcher) {
    watcher
      .on("add", (path) => this.onAddAsset(path))
      .on("change", (path) => this.onChangeAsset(path))
      .on("unlink", (path) => this.onRemoveAsset(path))
  }

  onAddAsset(path: string) {
    const newAsset = this.getAsset(path)

    if (newAsset instanceof AssetSourceFile) {
      newAsset.compile(this.program)
    } else if (newAsset instanceof AssetGodotScene) {
      buildSceneImports(this)
    }

    buildAssetPathsType(this)
  }

  onChangeAsset(path: string) {
    console.log("Change:\t", path)

    let oldAsset = this.assets.find((asset) => asset.fsPath === path)

    if (oldAsset) {
      let newAsset = (this.getAsset(path) as any) as BaseAsset

      this.assets = this.assets.filter((a) => a.fsPath !== path)
      this.assets.push(newAsset)

      if (newAsset instanceof AssetSourceFile) {
        newAsset.compile(this.program)
      } else if (newAsset instanceof AssetGodotScene) {
        for (const script of this.sourceFiles()) {
          buildNodePathsTypeForScript(script, this)
        }
      }
    }
  }

  onRemoveAsset(path: string) {
    console.log("Delete:\t", path)

    const changedAsset = this.assets.find((asset) => asset.fsPath === path)

    if (!changedAsset) {
      return
    }

    if (changedAsset instanceof AssetSourceFile) {
      changedAsset.destroy()
    }
  }

  compileAllSourceFiles() {
    for (const asset of this.assets) {
      if (asset instanceof AssetSourceFile) {
        asset.compile(this.program)
      }
    }
  }

  buildAllDefinitions() {
    generateGodotLibraryDefinitions(this)

    buildAssetPathsType(this)

    for (const script of this.sourceFiles()) {
      buildNodePathsTypeForScript(script, this)
    }

    buildSceneImports(this)
    buildGroupTypes(this)
  }

  static ResPathToFsPath(resPath: string) {
    return path.join(this.tsgdPath, resPath.slice("res://".length))
  }

  static FsPathToResPath(fsPath: string) {
    return "res://" + fsPath.slice(this.tsgdPath.length + 1)
  }
}

export const makeTsGdProject = async (
  program: ts.WatchOfConfigFile<ts.EmitAndSemanticDiagnosticsBuilderProgram>
) => {
  const { tsgdPath, tsgdPathWithFilename } = getTsgdPath()
  const initialFiles: string[] = []

  let addFn!: (path: string) => void
  let readyFn!: () => void

  const watcher = await new Promise<chokidar.FSWatcher>((resolve) => {
    addFn = (path) => initialFiles.push(path)
    readyFn = () => resolve(watcher)

    const watcher: chokidar.FSWatcher = chokidar
      .watch(tsgdPath, {
        ignored: (path: string, stats: any) => {
          return !shouldIncludePath(path)
        },
      })
      .on("add", addFn)
      .on("ready", readyFn)
  })

  watcher.off("add", addFn)
  watcher.off("ready", readyFn)

  return new TsGdProjectClass(
    watcher,
    initialFiles,
    program,
    tsgdPath,
    tsgdPathWithFilename
  )
}

const shouldIncludePath = (path: string): boolean => {
  if (!path.includes(".")) {
    // Folder (i hope)
    // TODO: Might be able to check stat to be more sure about this
    return true
  }

  if (path.includes("godot_defs")) {
    return false
  }

  if (path.includes(".git")) {
    return false
  }

  if (path.endsWith(".ttf")) {
    return true
  }

  if (path.endsWith(".gd")) {
    return true
  }

  // Note ordering (re: .ts)
  if (path.endsWith(".d.ts")) {
    return false
  }

  if (path.endsWith(".ts")) {
    return true
  }

  if (path.endsWith(".tscn")) {
    return true
  }

  if (path.endsWith(".godot")) {
    return true
  }

  return false
}

const getTsgdPath = () => {
  const inputPath = process.argv[2]
  let tsgdPathWithFilename: string
  let tsgdPath: string

  if (!inputPath) {
    throw new Error(
      "Please specify a tsgd.json file on the command line. Thanks!"
    )
  }

  if (inputPath.startsWith("/")) {
    // absolute path

    tsgdPathWithFilename = inputPath
  } else if (inputPath.startsWith(".")) {
    // some sort of relative path, so resolve it

    tsgdPathWithFilename = path.join(process.execPath, inputPath)
  } else {
    console.error("That appears to be an invalid path.")
    process.exit(0)
  }

  tsgdPath = path.dirname(tsgdPathWithFilename)

  return { tsgdPath, tsgdPathWithFilename }
}