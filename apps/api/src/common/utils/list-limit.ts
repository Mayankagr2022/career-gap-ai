/**
 * Upper bound for list endpoints that return everything a user owns (newest first). It keeps responses and polling
 * payloads bounded for heavy users; the web app shows these as one scrolling list, so no page parameters yet.
 */
export const USER_LIST_LIMIT = 200;
