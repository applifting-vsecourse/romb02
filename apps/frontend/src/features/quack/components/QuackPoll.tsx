import { formatDistanceToNowStrict } from "date-fns"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { useVotePoll } from "@/features/quack/hooks/useVotePoll"
import { isPollClosed, percentOf } from "@/features/quack/lib/poll"

type QuackPollProps = { quackId: string; poll: Poll }

const pluralVotes = (count: number) => `${count} ${count === 1 ? "vote" : "votes"}`

export function QuackPoll({ quackId, poll }: QuackPollProps) {
  const votePoll = useVotePoll()
  const isClosed = isPollClosed(poll)
  const hasCounts = poll.resultsVisible && poll.totalVotes !== undefined
  // After a first vote the pick shows at once; the counts follow with the
  // server's response, so the bars hold a skeleton until then.
  const shouldShowBars = hasCounts || (poll.myOptionId !== null && !isClosed)
  const total = poll.totalVotes ?? 0

  const vote = (optionId: string) => {
    if (isClosed || optionId === poll.myOptionId) return
    votePoll.mutate({ quackId, optionId })
  }

  const status = [
    hasCounts ? pluralVotes(total) : null,
    !hasCounts && poll.myOptionId === null && !isClosed ? "Vote to see the results" : null,
    isClosed ? "Closed" : null,
    !isClosed && poll.closesAt
      ? `Closes ${formatDistanceToNowStrict(poll.closesAt, { addSuffix: true })}`
      : null,
  ].filter((part): part is string => part !== null)

  return (
    <div
      role="group"
      aria-label="Poll"
      className="mt-2 flex flex-col gap-2"
    >
      <ul className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const isMine = option.id === poll.myOptionId

          if (!shouldShowBars) {
            return (
              <li key={option.id}>
                {isClosed ? (
                  <p className="px-3 py-2 text-sm">{option.text}</p>
                ) : (
                  <Button
                    variant="outline"
                    className="h-auto w-full justify-start py-2 text-left font-normal whitespace-normal"
                    onClick={() => vote(option.id)}
                  >
                    {option.text}
                  </Button>
                )}
              </li>
            )
          }

          const percent = percentOf(option.votes ?? 0, total)
          const result = (
            <>
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 text-left">
                  {isMine ? (
                    <Check
                      className="size-4"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span>{option.text}</span>
                  {isMine ? <span className="sr-only"> (your vote)</span> : null}
                </span>
                {hasCounts ? (
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {percent}% · {pluralVotes(option.votes ?? 0)}
                  </span>
                ) : null}
              </span>
              {hasCounts ? (
                <Progress
                  value={percent}
                  aria-label={`${option.text}: ${percent}%`}
                />
              ) : (
                <Skeleton className="h-2 w-full rounded-full" />
              )}
            </>
          )

          const rowClassName = "flex w-full flex-col items-stretch gap-1 px-3 py-2 text-sm"

          return (
            <li key={option.id}>
              {isClosed ? (
                <div className={rowClassName}>{result}</div>
              ) : (
                // Open polls keep every answer clickable so people can switch.
                <Button
                  variant="ghost"
                  aria-pressed={isMine}
                  className={cn(rowClassName, "h-auto font-normal whitespace-normal")}
                  onClick={() => vote(option.id)}
                >
                  {result}
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {status.length > 0 ? (
        <p className="text-xs text-muted-foreground">{status.join(" · ")}</p>
      ) : null}
    </div>
  )
}
