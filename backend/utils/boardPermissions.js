const MUTATING_ROLES = new Set(['Admin', 'Manager', 'Member']);
function canMutateBoards(user) {
  return Boolean(user && MUTATING_ROLES.has(user.role));
}
module.exports = { canMutateBoards };
