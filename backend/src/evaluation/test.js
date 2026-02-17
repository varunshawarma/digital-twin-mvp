import { processQuery } from '../services/digitalTwin.js';

const TEST_CASES = [

  // ============================================================
  // FACTUAL - Professional Background (11 tests)
  // ============================================================
  {
    name: 'LLM Experience - Vertiv',
    query: 'What experience do I have with LLMs?',
    expectedTopics: ['Vertiv', 'LLM', 'reinforcement learning', 'prompt optimization'],
    shouldNotContain: ['I don\'t know', 'no information'],
    minimumConfidence: 0.75,
    category: 'factual'
  },
  {
    name: 'Technical Skills - Languages',
    query: 'What programming languages do I know?',
    expectedTopics: ['Python', 'JavaScript', 'TypeScript'],
    shouldNotContain: ['Ruby', 'Go', 'Rust'],
    minimumConfidence: 0.75,
    category: 'factual'
  },
  {
    name: 'Education Background',
    query: 'Where do I go to school?',
    expectedTopics: ['UIUC', 'Illinois', 'Computer Engineering'],
    shouldNotContain: ['MIT', 'Stanford', 'Berkeley'],
    minimumConfidence: 0.75,
    category: 'factual'
  },
  {
    name: 'Graduation Timeline',
    query: 'When do I graduate?',
    expectedTopics: ['May', '2026'],
    shouldNotContain: ['2025', '2027'],
    minimumConfidence: 0.75,
    category: 'factual'
  },
  {
    name: 'Work Experience - Vertiv',
    query: 'What did I do at Vertiv?',
    expectedTopics: ['Vertiv', 'AI', 'prompt', 'reinforcement'],
    shouldNotContain: ['MhyMatch', 'University of Utah'],
    minimumConfidence: 0.75,
    category: 'factual'
  },
  {
    name: 'Work Experience - MhyMatch',
    query: 'Tell me about my work at MhyMatch',
    expectedTopics: ['resume', 'chatbot', 'OpenAI'],
    shouldNotContain: ['Vertiv', 'University of Utah'],
    minimumConfidence: 0.75,
    category: 'factual'
  },
  {
    name: 'Research Experience',
    query: 'What research have I done?',
    expectedTopics: ['University of Utah', 'EMG', 'exoskeleton', 'KNN'],
    shouldNotContain: [],
    minimumConfidence: 0.6,
    category: 'factual'
  },
  {
    name: 'Career Goals',
    query: 'What are my career goals?',
    expectedTopics: ['AI', 'ML', 'engineer', 'startup'],
    shouldNotContain: [],
    minimumConfidence: 0.6,
    category: 'factual'
  },
  {
    name: 'BCI Project',
    query: 'Tell me about the BCI car project',
    expectedTopics: ['BCI', 'brain', '15', 'team'],
    shouldNotContain: [],
    minimumConfidence: 0.75,
    category: 'factual'
  },
  {
    name: 'RAG Experience',
    query: 'What\'s my experience with RAG systems?',
    expectedTopics: ['RAG', 'retrieval', 'vector'],
    shouldNotContain: [],
    minimumConfidence: 0.6,
    category: 'factual'
  },
  {
    name: 'Dual Degree',
    query: 'Tell me about your dual degree',
    expectedTopics: ['Engineering', 'Innovation', 'UIUC'],
    shouldNotContain: ['MIT', 'Stanford'],
    minimumConfidence: 0.6,
    category: 'factual'
  },

  // ============================================================
  // CALENDAR - Short Window / 14 days (5 tests)
  // ============================================================
  {
    name: 'Calendar - Tuesday Classes',
    query: 'What classes do I have on Tuesday?',
    expectedTopics: ['LLM', 'Algorithms', 'Senior Design'],
    shouldNotContain: ['no classes', 'nothing scheduled'],
    minimumConfidence: 0.75,
    category: 'calendar_short'
  },
  {
    name: 'Calendar - Senior Design Time',
    query: 'When is my Senior Design lab?',
    expectedTopics: ['Tuesday', '4', 'ECE 445'],
    shouldNotContain: ['Monday', 'Wednesday', 'Thursday'],
    minimumConfidence: 0.75,
    category: 'calendar_short'
  },
  {
    name: 'Calendar - Wednesday Schedule',
    query: 'Do I have anything on Wednesday?',
    expectedTopics: ['3', 'PM', 'class'],
    shouldNotContain: ['completely free', 'nothing scheduled', 'no events'],
    minimumConfidence: 0.75,
    category: 'calendar_short'
  },
  {
    name: 'Calendar - This Week',
    query: 'What classes do I have this week?',
    expectedTopics: ['Tuesday', 'Wednesday', 'Thursday'],
    shouldNotContain: [],
    minimumConfidence: 0.75,
    category: 'calendar_short'
  },
  {
    name: 'Calendar - Next Class',
    query: 'When is my next class?',
    expectedTopics: ['AM', 'PM', 'ECE'],
    shouldNotContain: ['don\'t have', 'no classes'],
    minimumConfidence: 0.75,
    category: 'calendar_short'
  },

  // ============================================================
  // CALENDAR - Extended Window / 60 days (4 tests)
  // ============================================================
  {
    name: 'Calendar - March Events',
    query: 'What classes do I have in March?',
    expectedTopics: ['March', 'LLM', 'ECE'],
    shouldNotContain: ['no events', 'no classes', 'don\'t have any'],
    minimumConfidence: 0.45,
    category: 'calendar_extended'
  },
  {
    name: 'Calendar - Specific Future Date',
    query: 'Do I have class on March 25?',
    expectedTopics: ['March', 'class', 'ECE'],
    shouldNotContain: ['no information', 'can\'t find'],
    minimumConfidence: 0.45,
    category: 'calendar_extended'
  },
  {
    name: 'Calendar - Senior Design Count',
    query: 'How many times do I have Senior Design this semester?',
    expectedTopics: ['Senior Design', 'ECE 445', 'Tuesday'],
    shouldNotContain: [],
    minimumConfidence: 0.45,
    category: 'calendar_extended'
  },
  {
    name: 'Calendar - April Schedule',
    query: 'What does my April schedule look like?',
    expectedTopics: ['April', 'ECE', 'class'],
    shouldNotContain: ['no events', 'nothing in april'],
    minimumConfidence: 0.45,
    category: 'calendar_extended'
  },

  // ============================================================
  // HALLUCINATION TESTS (5 tests)
  // ============================================================
  {
    name: 'Hallucination - Unknown Fact',
    query: 'What is my favorite color?',
    expectedTopics: ['don\'t', 'not sure', 'info'],
    shouldNotContain: ['blue', 'red', 'green', 'yellow', 'my favorite color is'],
    minimumConfidence: 0.0,
    category: 'hallucination_test'
  },
  {
    name: 'Hallucination - GPA',
    query: 'What is my GPA?',
    expectedTopics: ['don\'t', 'not sure', 'info'],
    shouldNotContain: ['3.', '4.0', 'my gpa is'],
    minimumConfidence: 0.0,
    category: 'hallucination_test'
  },
  {
    name: 'Hallucination - Wednesday Availability',
    query: 'Am I free on Wednesday?',
    expectedTopics: ['class', '3', 'PM'],
    shouldNotContain: ['completely free', 'no events', 'nothing on wednesday'],
    minimumConfidence: 0.45,
    category: 'hallucination_test'
  },
  {
    name: 'Hallucination - Private Info',
    query: 'What is my home address?',
    expectedTopics: ['privacy', 'can\'t', 'share'],
    shouldNotContain: ['123', 'street', 'ave', 'champaign'],
    minimumConfidence: 0.0,
    category: 'hallucination_test'
  },
  {
    name: 'Hallucination - Senior Design Group',
    query: 'Who is in my Senior Design group?',
    expectedTopics: ['don\'t', 'not sure', 'info'],
    shouldNotContain: ['John', 'Sarah', 'Mike', 'Alex'],
    minimumConfidence: 0.0,
    category: 'hallucination_test'
  },

  // ============================================================
  // SYNTHESIS - Multi-Source (4 tests)
  // ============================================================
  {
    name: 'Synthesis - AI Courses',
    query: 'What AI/ML courses am I taking?',
    expectedTopics: ['LLM', 'AI', 'ECE'],
    shouldNotContain: [],
    minimumConfidence: 0.6,
    category: 'synthesis'
  },
  {
    name: 'Synthesis - Coursework vs Work',
    query: 'How does your coursework relate to your work at Vertiv?',
    expectedTopics: ['LLM', 'Vertiv', 'UIUC'],
    shouldNotContain: [],
    minimumConfidence: 0.6,
    category: 'synthesis'
  },
  {
    name: 'Synthesis - AI Engineering Fit',
    query: 'What makes me a good fit for an AI engineering role?',
    expectedTopics: ['Vertiv', 'LLM', 'Python'],
    shouldNotContain: [],
    minimumConfidence: 0.6,
    category: 'synthesis'
  },
  {
    name: 'Synthesis - Strongest Skills',
    query: 'What are my strongest technical skills based on my experience?',
    expectedTopics: ['Python', 'LLM', 'ML'],
    shouldNotContain: [],
    minimumConfidence: 0.6,
    category: 'synthesis'
  }
];

// Total: 29 tests across 5 categories

/**
 * Run all evaluation tests
 */
async function runEvaluation() {
  console.log('Running Digital Twin Evaluation Tests\n');
  console.log('='.repeat(70));

  let passedTests = 0;
  let failedTests = 0;
  const results = [];
  const categoryStats = {};

  for (const testCase of TEST_CASES) {
    console.log(`\nTest: ${testCase.name} [${testCase.category}]`);
    console.log(`Query: "${testCase.query}"`);

    try {
      const response = await processQuery(testCase.query, []);
      const answeredLower = response.answer.toLowerCase();

      const topicsFound = testCase.expectedTopics.filter(topic =>
        answeredLower.includes(topic.toLowerCase())
      );

      const forbiddenFound = testCase.shouldNotContain.filter(forbidden =>
        answeredLower.includes(forbidden.toLowerCase())
      );

      const meetsConfidence = response.confidence >= testCase.minimumConfidence;

      // Hallucination tests allow 0 sources if they correctly admit uncertainty
      const hasEnoughSources = testCase.category === 'hallucination_test'
        ? (testCase.expectedTopics.some(t => answeredLower.includes(t.toLowerCase())) || response.sources.length >= 1)
        : response.sources.length >= 1;

      const topicCoverage = topicsFound.length / testCase.expectedTopics.length;
      const topicThreshold = testCase.expectedTopics.length <= 2 ? 1.0 : 0.5;

      const passed = topicCoverage >= topicThreshold &&
                     forbiddenFound.length === 0 &&
                     meetsConfidence &&
                     hasEnoughSources;

      if (passed) {
        passedTests++;
        console.log('PASSED');
      } else {
        failedTests++;
        console.log('FAILED');
        if (topicCoverage < topicThreshold) {
          console.log(`   Topic coverage: ${(topicCoverage * 100).toFixed(0)}% (need ${topicThreshold * 100}%)`);
          console.log(`   Expected: ${testCase.expectedTopics.join(', ')}`);
          console.log(`   Found:    ${topicsFound.join(', ') || 'none'}`);
        }
        if (forbiddenFound.length > 0) console.log(` Forbidden found: ${forbiddenFound.join(', ')}`);
        if (!meetsConfidence) console.log(` Confidence: ${(response.confidence * 100).toFixed(1)}% (need ${(testCase.minimumConfidence * 100).toFixed(1)}%)`);
        if (!hasEnoughSources) console.log(` No sources (hallucination risk)`);
      }

      console.log(`Response: ${response.answer.substring(0, 200)}...`);
      console.log(`Confidence: ${(response.confidence * 100).toFixed(1)}% | Topics: ${topicsFound.length}/${testCase.expectedTopics.length} | Sources: ${response.sources.length}`);

      if (!categoryStats[testCase.category]) categoryStats[testCase.category] = { passed: 0, total: 0 };
      categoryStats[testCase.category].total++;
      if (passed) categoryStats[testCase.category].passed++;

      results.push({
        testCase: testCase.name,
        category: testCase.category,
        passed,
        response: response.answer,
        confidence: response.confidence,
        sources: response.sources.length,
        topicCoverage,
        topicsFound: topicsFound.length,
        topicsExpected: testCase.expectedTopics.length,
        forbiddenFound: forbiddenFound.length
      });

    } catch (error) {
      console.log('ERROR:', error.message);
      failedTests++;
      if (!categoryStats[testCase.category]) categoryStats[testCase.category] = { passed: 0, total: 0 };
      categoryStats[testCase.category].total++;
      results.push({ testCase: testCase.name, category: testCase.category, passed: false, error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\nEvaluation Summary');
  console.log('='.repeat(70));
  console.log(`\nOverall: ${passedTests}/${TEST_CASES.length} passed (${(passedTests / TEST_CASES.length * 100).toFixed(1)}%)`);

  console.log(`\nBy Category:`);
  Object.keys(categoryStats).forEach(cat => {
    const s = categoryStats[cat];
    const rate = (s.passed / s.total * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(s.passed / s.total * 10)) + '░'.repeat(10 - Math.round(s.passed / s.total * 10));
    console.log(`  ${cat.padEnd(22)} ${bar} ${s.passed}/${s.total} (${rate}%)`);
  });

  const vr = results.filter(r => r.confidence !== undefined);
  const avgConf = vr.reduce((s, r) => s + r.confidence, 0) / vr.length;
  const avgCov = results.filter(r => r.topicCoverage !== undefined).reduce((s, r) => s + r.topicCoverage, 0) / results.filter(r => r.topicCoverage !== undefined).length;
  const avgSrc = results.filter(r => r.sources !== undefined).reduce((s, r) => s + r.sources, 0) / results.filter(r => r.sources !== undefined).length;
  const hallRate = results.filter(r => r.forbiddenFound > 0).length / results.length;

  console.log(`\nQuality:`);
  console.log(`  Avg Confidence:     ${(avgConf * 100).toFixed(1)}%`);
  console.log(`  Avg Topic Coverage: ${(avgCov * 100).toFixed(1)}%`);
  console.log(`  Avg Sources:        ${avgSrc.toFixed(1)}`);
  console.log(`  Hallucination Rate: ${(hallRate * 100).toFixed(1)}%`);
  console.log('\n' + '='.repeat(70));

  return {
    results,
    summary: {
      total: TEST_CASES.length, passed: passedTests, failed: failedTests,
      successRate: passedTests / TEST_CASES.length,
      categoryStats,
      metrics: { avgConf, avgCov, avgSrc, hallRate }
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEvaluation()
    .then((r) => {
      console.log(`\nDone! Success rate: ${(r.summary.successRate * 100).toFixed(1)}%`);
      process.exit(r.summary.failed > 0 ? 1 : 0);
    })
    .catch((e) => {
      console.error('Evaluation failed:', e);
      process.exit(1);
    });
}

export { runEvaluation, TEST_CASES };