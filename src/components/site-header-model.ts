export type SiteHeaderState = {
  mobileOpen: boolean;
};

export type SiteHeaderAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "navigate" };

export const initialSiteHeaderState: SiteHeaderState = {
  mobileOpen: false,
};

export function siteHeaderReducer(
  state: SiteHeaderState,
  action: SiteHeaderAction,
): SiteHeaderState {
  switch (action.type) {
    case "open":
      return state.mobileOpen ? state : { mobileOpen: true };
    case "close":
    case "navigate":
      return state.mobileOpen ? { mobileOpen: false } : state;
  }
}
