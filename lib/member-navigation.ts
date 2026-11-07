export function openMemberProfile(memberId: string) {
  if (typeof window !== "undefined" && memberId) {
    window.dispatchEvent(new CustomEvent("gymdesk:open-member-profile", { detail: { memberId } }));
  }
}
