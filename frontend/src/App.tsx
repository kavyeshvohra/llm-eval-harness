import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'

const AVAILABLE_MODELS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'gemini-flash', label: 'Gemini Flash' },
]

const getTestCaseCount = (value: unknown) => {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') {
    const testCases = (value as { testCases?: unknown }).testCases
    if (Array.isArray(testCases)) return testCases.length
  }
  return value == null ? 0 : 1
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [testCaseCount, setTestCaseCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('gemini')
  const [promptVersions, setPromptVersions] = useState([
    { id: 1, label: 'Prompt A', value: '' },
    { id: 2, label: 'Prompt B', value: '' },
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedTestCases, setCompletedTestCases] = useState(0)
  const [totalTestCases, setTotalTestCases] = useState(0)
  const [promptResults, setPromptResults] = useState<Array<{
    id: number
    version: string
    status: string
    completed: number
    errors: number
  }>>([])

  const handleFile = async (file: File) => {
    setError(null)

    if (!file.name.toLowerCase().endsWith('.json')) {
      setFileName(null)
      setTestCaseCount(0)
      setError('Please select or drop a file in .json format.')
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      setFileName(file.name)
      setTestCaseCount(getTestCaseCount(parsed))
    } catch {
      setFileName(null)
      setTestCaseCount(0)
      setError('The selected file is not valid JSON.')
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const updatePrompt = (id: number, value: string) => {
    setPromptVersions((versions) =>
      versions.map((version) =>
        version.id === id ? { ...version, value } : version,
      ),
    )
  }

  const addPromptVersion = () => {
    setPromptVersions((versions) => {
      const nextNumber = versions.length + 1
      return [
        ...versions,
        { id: Date.now(), label: `Prompt ${String.fromCharCode(64 + nextNumber)}`, value: '' },
      ]
    })
  }

  const removePromptVersion = (id: number) => {
    setPromptVersions((versions) =>
      versions.length > 2 ? versions.filter((version) => version.id !== id) : versions,
    )
  }

  const canRunEvaluation =
    !isProcessing &&
    promptVersions
      .slice(0, 2)
      .every((prompt) => prompt.value.trim().length > 0) &&
    testCaseCount > 0

  const runEvaluation = () => {
    if (!canRunEvaluation) return

    const total = testCaseCount * promptVersions.length
    setIsProcessing(true)
    setCompletedTestCases(0)
    setTotalTestCases(total)
    setPromptResults(promptVersions.map((prompt, index) => ({
      id: prompt.id,
      version: `V${index + 1}`,
      status: 'Queued',
      completed: 0,
      errors: 0,
    })))
  }

  useEffect(() => {
    if (!isProcessing) return

    const interval = window.setInterval(() => {
      setCompletedTestCases((completed) => {
        const nextCompleted = Math.min(completed + 1, totalTestCases)

        setPromptResults((results) => results.map((result, index) => {
          const completedForVersion = Math.min(
            testCaseCount,
            Math.max(0, nextCompleted - (index * testCaseCount)),
          )
          const status = completedForVersion === testCaseCount
            ? 'Completed'
            : completedForVersion > 0
              ? 'Running'
              : nextCompleted > 0
                ? 'Queued'
                : 'Running'

          return { ...result, completed: completedForVersion, status }
        }))

        if (nextCompleted >= totalTestCases) {
          window.clearInterval(interval)
          setIsProcessing(false)
        }

        return nextCompleted
      })
    }, 300)

    return () => window.clearInterval(interval)
  }, [isProcessing, testCaseCount, totalTestCases])

  const progress = totalTestCases === 0
    ? 0
    : Math.round((completedTestCases / totalTestCases) * 100)

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-950 px-6 py-10 text-slate-100">
      {(isProcessing || promptResults.length > 0) && (
        <aside className="fixed right-6 top-6 z-10 w-72 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-100">
              Evaluation Task
            </p>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
              isProcessing
                ? 'bg-cyan-400/15 text-cyan-400'
                : 'bg-emerald-400/15 text-emerald-400'
            }`}>
              {isProcessing ? 'Running' : 'Complete'}
            </span>
          </div>
          <p className="mb-2 text-xs text-slate-400">
            {completedTestCases} / {totalTestCases} test cases
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-slate-700"
          >
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </aside>
      )}

      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-400">
        Prompt Evaluation
      </p>

      <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-2">
        <section className="w-full text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Testcases
          </h1>

          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleInputChange}
            className="hidden"
          />

          <div
            role="button"
            tabIndex={isProcessing ? -1 : 0}
            aria-disabled={isProcessing}
            onClick={() => {
              if (!isProcessing) inputRef.current?.click()
            }}
            onKeyDown={(event) => {
              if (!isProcessing && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragEnter={(event) => {
              if (!isProcessing) {
                event.preventDefault()
                setIsDragging(true)
              }
            }}
            onDragOver={(event) => {
              if (!isProcessing) event.preventDefault()
            }}
            onDragLeave={() => {
              if (!isProcessing) setIsDragging(false)
            }}
            onDrop={(event) => {
              if (!isProcessing) handleDrop(event)
            }}
            className={`rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
              isProcessing
                ? 'cursor-not-allowed border-slate-700 opacity-50'
                : `cursor-pointer ${isDragging
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-slate-600 hover:border-cyan-400 hover:bg-slate-900'}`
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto mb-4 h-12 w-12 text-cyan-400"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 007.5 20h9a2.5 2.5 0 002.5-2.5v-3" />
            </svg>

            {fileName ? (
              <>
                <p className="text-lg font-semibold text-emerald-400">{fileName}</p>
                <p className="mt-2 text-sm text-slate-400">JSON file loaded successfully</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">Drag and drop a JSON file here</p>
                <p className="mt-2 text-sm text-slate-400">or click to browse (.json only)</p>
              </>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm font-medium text-red-400">
              {error}
            </p>
          )}

          <label htmlFor="testcase-input" className="mt-6 block text-left text-sm font-medium text-slate-300">
            Testcase JSON
          </label>
          <textarea
            id="testcase-input"
            disabled={isProcessing}
            placeholder="Paste your JSON testcase here..."
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            rows={10}
            onChange={(event) => {
              const value = event.target.value

              if (fileName === null) {
                try {
                  setTestCaseCount(getTestCaseCount(JSON.parse(value)))
                } catch {
                  setTestCaseCount(0)
                  setError('Invalid JSON')
                }
              }
            }}
          />

          <button
            type="button"
            onClick={runEvaluation}
            disabled={!canRunEvaluation}
            title={canRunEvaluation ? 'Run evaluation' : 'Enter both Prompt A and Prompt B to run'}
            className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              canRunEvaluation
                ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-500'
                : 'cursor-not-allowed bg-slate-700 text-slate-400'
            }`}
          >
            {isProcessing ? `Processing... (${completedTestCases}/${totalTestCases})` : 'Run Evaluation'}
          </button>
        </section>

        <section className="w-full text-center">
          <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Prompt Versions
          </h2>

          <label htmlFor="model" className="mb-2 block text-left text-sm font-medium text-slate-300">
            Model
          </label>
          <select
            id="model"
            disabled={isProcessing}
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            className="mb-6 w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-left text-slate-100 focus:border-cyan-400 focus:outline-none"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>

          <div className="space-y-4">
            {promptVersions.map((prompt, index) => (
              <div key={prompt.id} className="text-left">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor={`prompt-${prompt.id}`} className="text-sm font-medium text-slate-300">
                    {prompt.label}
                  </label>
                  {index >= 2 && (
                    <button
                      type="button"
                      onClick={() => removePromptVersion(prompt.id)}
                      disabled={isProcessing}
                      className="text-sm text-slate-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  id={`prompt-${prompt.id}`}
                  value={prompt.value}
                  onChange={(event) => updatePrompt(prompt.id, event.target.value)}
                  placeholder={`Enter prompt version ${index + 1}...`}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  rows={1}
                  disabled={isProcessing}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPromptVersion}
            disabled={isProcessing}
            className="mt-4 cursor-pointer rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:bg-cyan-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add prompt version
          </button>
        </section>
      </section>

      {isProcessing || promptResults.length > 0 ? (
        <div className="mt-10 w-full max-w-6xl rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="mb-4 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">
              {isProcessing ? 'Evaluation in Progress' : 'Evaluation Complete'}
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {completedTestCases} / {totalTestCases} Test Cases
            </h1>
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="mb-4 h-3 overflow-hidden rounded-full bg-slate-700"
          >
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-sm text-slate-300">
                <tr>
                  <th className="px-5 py-4 font-semibold">Prompt Version</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Test Cases Completed</th>
                  <th className="px-5 py-4 font-semibold">Errors</th>
                </tr>
              </thead>
              <tbody>
                {promptResults.map((result) => (
                  <tr key={result.id} className="border-t border-slate-800">
                    <td className="px-5 py-4 font-medium text-cyan-400">{result.version}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        result.status === 'Completed'
                          ? 'bg-emerald-400/15 text-emerald-400'
                          : result.status === 'Running'
                            ? 'bg-cyan-400/15 text-cyan-400'
                            : 'bg-slate-700 text-slate-300'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-200">
                      {result.completed} / {testCaseCount}
                    </td>
                    <td className="px-5 py-4 text-slate-200">{result.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
