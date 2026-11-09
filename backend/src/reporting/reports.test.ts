import { toCSV, type ReportSummary } from './reports.service';

describe('Reports toCSV conversion', () => {
  const mockSummary: ReportSummary = {
    diffRunId: 'diff-1',
    generatedAt: '2026-01-01T00:00:00.000Z',
    overview: {
      totalChanges: 2,
      breaking: 1,
      warnings: 1,
      nonBreaking: 0,
      affectedConsumers: 2,
      testRunsTotal: 1,
      testRunsFailing: 0,
    },
    breakingChanges: [
      {
        id: 'c1',
        type: 'endpoint_removed',
        endpoint: 'DELETE /users/{id}',
        field: null,
        explanation: 'Endpoint was deleted, breaking all consumers.',
        affectedConsumers: [{ team: 'Mobile Team' }, { team: 'Analytics, Data' }],
      },
    ],
    warnings: [
      {
        id: 'w1',
        type: 'field_deprecated',
        endpoint: 'GET /users',
        explanation: 'Field "legacyId" is deprecated.',
      },
    ],
    testResults: [],
    recommendations: ['Coordinate with teams before release.'],
  };

  it('generates CSV with header and properly escaped lines', () => {
    const csv = toCSV(mockSummary);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Change Type,Classification,Endpoint,Field,Explanation,Affected Teams');
    expect(lines).toHaveLength(3);

    // Row 1: breaking change with comma in explanation / affected teams
    expect(lines[1]).toContain('breaking,BREAKING,DELETE /users/{id},,"Endpoint was deleted, breaking all consumers.","Mobile Team;Analytics, Data"');

    // Row 2: warning change with quotes in explanation
    expect(lines[2]).toContain('warning,WARNING,GET /users,,"Field ""legacyId"" is deprecated.",');
  });
});

