/// <reference types="vite/client" />

declare module '*.json' {
  const value: { abi: unknown[]; bytecode: string }
  export default value
}

declare module '*.md?raw' {
  const content: string
  export default content
}
