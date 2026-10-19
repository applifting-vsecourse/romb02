import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { votePoll, type VotePollInput } from "@/features/quack/api/votePoll"
import { applyVote } from "@/features/quack/lib/poll"

const updatePoll =
  (quackId: string, update: (poll: Poll) => Poll) =>
  (quacks: Quack[] | undefined): Quack[] | undefined =>
    quacks?.map((quack) =>
      quack.id === quackId && quack.poll ? { ...quack, poll: update(quack.poll) } : quack,
    )

// Voting is optimistic: every cached feed (any search) shows the vote at once,
// and is put back exactly as it was if the server says no.
export function useVotePoll() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: votePoll,
    onMutate: async ({ quackId, optionId }: VotePollInput) => {
      // A refetch landing mid-vote would overwrite the optimistic state.
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })
      const snapshot: [QueryKey, Quack[] | undefined][] = queryClient.getQueriesData<Quack[]>({
        queryKey: quackKeys.lists(),
      })
      queryClient.setQueriesData<Quack[]>(
        { queryKey: quackKeys.lists() },
        updatePoll(quackId, (poll) => applyVote(poll, optionId)),
      )
      return { snapshot }
    },
    onSuccess: (poll, { quackId }) => {
      queryClient.setQueriesData<Quack[]>(
        { queryKey: quackKeys.lists() },
        updatePoll(quackId, () => poll),
      )
    },
    onError: (error, variables, context) => {
      for (const [queryKey, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(queryKey, data)
      }
      toast.error("Your vote didn't go through", {
        description: error.message,
        action: { label: "Retry", onClick: () => mutation.mutate(variables) },
      })
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })

  return mutation
}
