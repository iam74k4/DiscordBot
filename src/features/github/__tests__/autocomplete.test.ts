import { describe, expect, it } from 'vitest';
import { buildGitHubAutocompleteChoices } from '../application/autocomplete.js';

describe('buildGitHubAutocompleteChoices', () => {
  it('does not leak non-allowlisted recent repos to non-owners', () => {
    const choices = buildGitHubAutocompleteChoices(
      'octo',
      ['octo/private-repo', 'octo/hello-world'],
      ['octo/hello-world'],
      false
    );

    expect(choices).toEqual(['octo/hello-world']);
  });

  it('keeps recent repo suggestions for owners', () => {
    const choices = buildGitHubAutocompleteChoices(
      'octo',
      ['octo/private-repo', 'octo/hello-world'],
      ['octo/hello-world'],
      true
    );

    expect(choices).toEqual(['octo/private-repo', 'octo/hello-world']);
  });
});
