const GROUPS_ENDPOINT = '/api/bsuir/groups';

function normalizeGroup(group) {
  return String(group || '')
    .trim()
    .toUpperCase();
}

function normalizeGroups(groups) {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups
    .filter(
      group =>
        group &&
        typeof group === 'object' &&
        typeof group.name === 'string' &&
        group.name.trim()
    )
    .map(group => ({
      ...group,
      name: normalizeGroup(group.name)
    }))
    .filter(group => group.name);
}

export async function fetchStudentGroups({
  signal
} = {}) {
  const response = await fetch(
    GROUPS_ENDPOINT,
    {
      headers: {
        Accept: 'application/json'
      },
      signal
    }
  );

  let json = null;

  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(
      json?.error ||
        json?.message ||
        `Groups server returned HTTP ${response.status}.`
    );
  }

  if (
    !json ||
    !Array.isArray(json.groups)
  ) {
    throw new Error(
      'The groups server returned an invalid response.'
    );
  }

  return {
    groups: normalizeGroups(json.groups),
    cached: Boolean(json.cached),
    stale: Boolean(json.stale)
  };
}

export function findStudentGroup(
  groups,
  groupName
) {
  const target =
    normalizeGroup(groupName);

  if (!target) {
    return null;
  }

  return (
    groups.find(
      group =>
        normalizeGroup(
          group?.name
        ) === target
    ) || null
  );
}

export { normalizeGroup };