// Re-export all REST API types and handlers from the new structure
// This maintains backward compatibility for existing imports

export {
  REST_GET,
  REST_POST,
  handleFirstAdmin,
  type DeesseAPIConfig,
} from "./api/rest";
