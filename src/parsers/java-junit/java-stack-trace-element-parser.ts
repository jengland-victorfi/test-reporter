export interface StackTraceElement {
  classLoader: string | undefined
  moduleNameAndVersion: string | undefined
  tracePath: string
  fileName: string
  lineStr: string
}

// classloader and module name are optional:
// at <CLASSLOADER>/<MODULE_NAME_AND_VERSION>/<FULLY_QUALIFIED_METHOD_NAME>(<FILE_NAME>:<LINE_NUMBER>)
// at <CLASSLOADER>//<FULLY_QUALIFIED_METHOD_NAME>(<FILE_NAME>:<LINE_NUMBER>)
// at <MODULE_NAME>/<FULLY_QUALIFIED_METHOD_NAME>(<FILE_NAME>:<LINE_NUMBER>)
// https://github.com/eclipse-openj9/openj9/issues/11452#issuecomment-754946992
const re = /^\s*at (.*)\((.*):(\d+)\)$/

export function parseStackTraceElement(stackTraceLine: string): StackTraceElement | undefined {
  const match = stackTraceLine.match(re)
  if (match !== null) {
    const [, beforeParen, fileName, lineStr] = match
    const {classLoader, moduleNameAndVersion, tracePath} = parseClassLoaderModuleAndTracePath(beforeParen)
    return {
      classLoader,
      moduleNameAndVersion,
      tracePath,
      fileName,
      lineStr
    }
  }
  return undefined
}

function parseClassLoaderModuleAndTracePath(beforeParen: string): {
  classLoader?: string
  moduleNameAndVersion?: string
  tracePath: string
} {
  const slashIndex = beforeParen.indexOf('/')
  if (slashIndex === -1) {
    return {tracePath: beforeParen}
  }

  const firstSegment = beforeParen.substring(0, slashIndex)
  const afterFirstSlash = beforeParen.substring(slashIndex + 1)

  // classloader//method
  if (afterFirstSlash.startsWith('/')) {
    return {
      classLoader: firstSegment,
      tracePath: afterFirstSlash.substring(1)
    }
  }

  const secondSlashIndex = afterFirstSlash.indexOf('/')
  if (secondSlashIndex !== -1) {
    const secondSegment = afterFirstSlash.substring(0, secondSlashIndex)
    const tracePath = afterFirstSlash.substring(secondSlashIndex + 1)
    return {
      classLoader: firstSegment,
      moduleNameAndVersion: secondSegment,
      tracePath
    }
  }

  // module/method (e.g. java.base/java.lang.Thread.getStackTrace)
  return {
    moduleNameAndVersion: firstSegment,
    tracePath: afterFirstSlash
  }
}
