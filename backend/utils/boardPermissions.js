const MUTATING_ROLES = new Set(['Admin', 'Manager', 'Member']);
// Centralize board access checks so route handlers use consistent permission rules.
function canMutateBoards(user) {
  return Boolean(user && MUTATING_ROLES.has(user.role));
}
module.exports = { canMutateBoards };
