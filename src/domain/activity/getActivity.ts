export const getActivity = () => ({
  activity: [
    {
      type: "trade" as const,
      description: "Opened a long position",
      at: new Date().toISOString(),
    },
    {
      type: "login" as const,
      description: "Signed in via wallet",
      at: new Date().toISOString(),
    },
  ],
});

