import { useMutation, useQueryClient } from "@tanstack/react-query"

import { profileKeys } from "@/features/profile/api/profileKeys"
import { updateProfile } from "@/features/profile/api/updateProfile"

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileKeys.mine(), profile)
      // A new name or @username has to show up everywhere straight away — the
      // header's session, every quack in the feed — so refresh everything
      // rather than keep a list of which features render a user.
      await queryClient.invalidateQueries()
    },
  })
}
