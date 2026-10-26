import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"

export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteQuack,
    onSuccess: async (_, quackId) => {
      // Drop it from every cached feed (any tab, any search) right away, then
      // refetch to stay in sync with the server.
      queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
        quacks?.filter((quack) => quack.id !== quackId),
      )
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
    onError: (error) => {
      toast.error("Couldn't delete the quack", { description: error.message })
    },
  })
}
