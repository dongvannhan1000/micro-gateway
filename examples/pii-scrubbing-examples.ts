/**
 * PII Scrubbing Examples
 *
 * This file demonstrates how to use the PII scrubbing feature
 * in various scenarios.
 */

import { scrubPII } from '../apps/gateway-api/src/middleware/pii-scrub';

// ============================================================================
// BASIC USAGE
// ============================================================================

// Example 1: Simple email scrubbing
const basicExample = () => {
  const input = 'Contact me at user@example.com for support';
  const result = scrubPII(input, {
    enabled: true,
    level: 'medium'
  });

  console.log('Original:', input);
  console.log('Scrubbed:', result.scrubbedContent);
  console.log('Items scrubbed:', result.scrubbedCount);
  // Output: Contact me at u***@example.com for support
};

// Example 2: Chat completion with user data
const chatExample = () => {
  const chatRequest = {
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: 'My name is John Doe, email is john@example.com, phone is 1234567890'
      }
    ]
  };

  const result = scrubPII(JSON.stringify(chatRequest), {
    enabled: true,
    level: 'medium'
  });

  console.log('Scrubbed request:', result.scrubbedContent);
  // Output will have email and phone masked
};

// ============================================================================
// SCRUBBING LEVELS
// ============================================================================

// Example 3: Low level (basic PII only)
const lowLevelExample = () => {
  const input = 'Email: user@example.com, IP: 192.168.1.1, Key: sk-1234567890abcdef';
  const result = scrubPII(input, {
    enabled: true,
    level: 'low'  // Only emails, phones, SSN, credit cards
  });

  console.log('Low level:', result.scrubbedContent);
  // Email is scrubbed, IP and API key are not
};

// Example 4: Medium level (standard)
const mediumLevelExample = () => {
  const input = 'Email: user@example.com, IP: 192.168.1.1, Key: sk-1234567890abcdef';
  const result = scrubPII(input, {
    enabled: true,
    level: 'medium'  // Low level + API keys, IPs, tokens
  });

  console.log('Medium level:', result.scrubbedContent);
  // Email, IP, and API key are all scrubbed
};

// Example 5: High level (aggressive)
const highLevelExample = () => {
  const input = JSON.stringify({
    username: 'john',
    password: 'secret123',
    api_key: 'sk-1234567890abcdef',
    notes: 'Call 1234567890'
  });

  const result = scrubPII(input, {
    enabled: true,
    level: 'high'  // Medium level + passwords, secrets, credentials
  });

  console.log('High level:', result.scrubbedContent);
  // Password and api_key fields are scrubbed
};

// ============================================================================
// CUSTOM PATTERNS
// ============================================================================

// Example 6: Adding custom regex patterns
const customPatternExample = () => {
  const input = 'Order #ORD-12345678, Ticket #TICKET-98765';

  const result = scrubPII(input, {
    enabled: true,
    level: 'medium',
    customPatterns: [
      {
        name: 'order_id',
        pattern: '\\bORD-\\d{8}\\b',
        flags: 'g'
      },
      {
        name: 'ticket_id',
        pattern: '\\bTICKET-\\d{5}\\b',
        flags: 'g'
      }
    ]
  });

  console.log('Custom patterns:', result.scrubbedContent);
  // Both order and ticket IDs are masked
};

// Example 7: Medical record numbers (HIPAA scenario)
const medicalExample = () => {
  const input = 'Patient ID: PAT-123456, MRN: 123456789, Email: patient@hospital.com';

  const result = scrubPII(input, {
    enabled: true,
    level: 'high',
    customPatterns: [
      {
        name: 'patient_id',
        pattern: '\\bPAT-\\d{6}\\b',
        flags: 'g'
      },
      {
        name: 'medical_record_number',
        pattern: '\\bMRN:\\s*\\d{9}\\b',
        flags: 'gi'
      }
    ]
  });

  console.log('Medical record scrubbed:', result.scrubbedContent);
  // All patient identifiers are masked
};

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

// Example 8: Customer support chat
const supportChatExample = () => {
  const chatTranscript = `
    Customer: Hi, my name is Jane Doe. My email is jane@example.com.
    Support: Hi Jane, how can I help?
    Customer: I need help with my order ORD-12345678. Phone: 555-123-4567.
    Support: Let me check that for you.
  `;

  const result = scrubPII(chatTranscript, {
    enabled: true,
    level: 'high',
    customPatterns: [
      { name: 'order_id', pattern: '\\bORD-\\d{8}\\b', flags: 'g' }
    ]
  });

  console.log('Scrubbed transcript:', result.scrubbedContent);
  console.log('Details:', result.details);
  // Shows breakdown of what was scrubbed
};

// Example 9: Financial transaction log
const financialExample = () => {
  const transaction = {
    type: 'payment',
    card_number: '4111111111111111',
    amount: 99.99,
    customer_email: 'buyer@example.com',
    ssn: '123-45-6789'
  };

  const result = scrubPII(JSON.stringify(transaction), {
    enabled: true,
    level: 'high'
  });

  console.log('Financial data scrubbed:', result.scrubbedContent);
  // Card number, email, and SSN are all masked
};

// Example 10: API request with authentication
const apiRequestExample = () => {
  const apiRequest = {
    url: 'https://api.example.com/endpoint',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'X-API-Key': 'sk-1234567890abcdef'
    },
    body: {
      user_id: 'user123',
      contact: 'admin@example.com',
      notes: 'Call 1234567890 for details'
    }
  };

  const result = scrubPII(JSON.stringify(apiRequest), {
    enabled: true,
    level: 'high'
  });

  console.log('API request scrubbed:', result.scrubbedContent);
  // Bearer token, API key, email, and phone are all masked
};

// ============================================================================
// ANALYTICS AND MONITORING
// ============================================================================

// Example 11: Monitoring scrubbing activity
const monitoringExample = () => {
  const requests = [
    'Contact user@example.com',
    'Call 1234567890',
    'No PII here',
    'Email: admin@example.com, Phone: 555-123-4567'
  ];

  let totalScrubbed = 0;
  const typeCounts: Record<string, number> = {};

  requests.forEach(request => {
    const result = scrubPII(request, {
      enabled: true,
      level: 'medium'
    });

    totalScrubbed += result.scrubbedCount;

    result.details.forEach(detail => {
      typeCounts[detail.type] = (typeCounts[detail.type] || 0) + detail.count;
    });
  });

  console.log('Total PII items scrubbed:', totalScrubbed);
  console.log('Breakdown by type:', typeCounts);
  // Shows: { email: 2, phone: 2 }
};

// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================

// Example 12: Project-specific configuration
const projectConfigExample = () => {
  const projects = [
    {
      id: 'healthcare-app',
      pii_scrubbing_enabled: true,
      pii_scrubbing_level: 'high' as const,
      pii_custom_patterns: JSON.stringify([
        { name: 'patient_id', pattern: '\\bPAT-\\d{6}\\b', flags: 'g' },
        { name: 'mrn', pattern: '\\bMRN:\\s*\\d{9}\\b', flags: 'gi' }
      ])
    },
    {
      id: 'ecommerce-site',
      pii_scrubbing_enabled: true,
      pii_scrubbing_level: 'medium' as const,
      pii_custom_patterns: JSON.stringify([
        { name: 'order_id', pattern: '\\bORD-\\d{8}\\b', flags: 'g' }
      ])
    },
    {
      id: 'internal-tools',
      pii_scrubbing_enabled: false,  // Disabled for internal tools
      pii_scrubbing_level: 'low' as const
    }
  ];

  projects.forEach(project => {
    const config = {
      enabled: project.pii_scrubbing_enabled,
      level: project.pii_scrubbing_level,
      customPatterns: project.pii_custom_patterns
        ? JSON.parse(project.pii_custom_patterns)
        : undefined
    };

    console.log(`Project ${project.id} config:`, config);
  });
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Example 13: Handling invalid patterns gracefully
const errorHandlingExample = () => {
  const input = 'Test data with user@example.com';

  try {
    const result = scrubPII(input, {
      enabled: true,
      level: 'medium',
      customPatterns: [
        // Invalid pattern (will be handled gracefully)
        {
          name: 'invalid',
          pattern: '[invalid(regex',  // Malformed regex
          flags: 'g'
        }
      ]
    });
    console.log('Result:', result.scrubbedContent);
  } catch (error) {
    console.error('Scrubbing error:', error);
    // Fallback: log error, don't scrub, continue with request
  }
};

// Example 14: Disabling scrubbing for specific content
const selectiveScrubbingExample = () => {
  const input = 'Send email to user@example.com';

  // Method 1: Disable entirely
  const result1 = scrubPII(input, { enabled: false, level: 'medium' });
  console.log('Disabled:', result1.scrubbedContent);
  // Output unchanged

  // Method 2: Use low level (minimal scrubbing)
  const result2 = scrubPII(input, { enabled: true, level: 'low' });
  console.log('Low level:', result2.scrubbedContent);
  // Still scrubs email

  // Method 3: Use empty custom patterns
  const result3 = scrubPII(input, {
    enabled: true,
    level: 'low',  // Still uses built-in patterns
    customPatterns: []  // No additional patterns
  });
};

// ============================================================================
// EXPORT ALL EXAMPLES
// ============================================================================

export {
  basicExample,
  chatExample,
  lowLevelExample,
  mediumLevelExample,
  highLevelExample,
  customPatternExample,
  medicalExample,
  supportChatExample,
  financialExample,
  apiRequestExample,
  monitoringExample,
  projectConfigExample,
  errorHandlingExample,
  selectiveScrubbingExample
};

// Run examples if executed directly
if (require.main === module) {
  console.log('=== Basic Example ===');
  basicExample();

  console.log('\n=== Scrubbing Levels ===');
  lowLevelExample();
  mediumLevelExample();
  highLevelExample();

  console.log('\n=== Custom Patterns ===');
  customPatternExample();

  console.log('\n=== Real-World Scenarios ===');
  supportChatExample();
  financialExample();
}
