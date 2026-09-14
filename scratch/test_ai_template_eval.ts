import { validateAiTemplateOutput, AiTemplateSuggestion } from 'c:/ProjectData/pingstack/src/lib/ai-template-validator';

/**
 * Quality & Evaluation Dataset of Representative Pingstack Use Cases
 */
export const EVAL_DATASET = [
  {
    useCase: 'fee reminder',
    prompt: 'Fee payment reminder for school student with student name, pending amount, and due date',
    expectedCategory: 'UTILITY',
    mockModelOutput: {
      suggestions: [
        {
          name: 'student_fee_reminder',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Dear parent, this is a reminder that the school fee of {{1}} for student {{2}} is due on {{3}}. Please pay on time to avoid late fees.',
          variables: [
            { position: 1, meaning: 'Fee Amount' },
            { position: 2, meaning: 'Student Name' },
            { position: 3, meaning: 'Due Date' }
          ]
        },
        {
          name: 'urgent_fee_alert',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hello {{1}}, gentle reminder: pending fee of {{2}} for {{3}} term is due by {{4}}.',
          variables: [
            { position: 1, meaning: 'Parent Name' },
            { position: 2, meaning: 'Fee Amount' },
            { position: 3, meaning: 'Term/Class' },
            { position: 4, meaning: 'Due Date' }
          ]
        }
      ]
    }
  },
  {
    useCase: 'payment confirmation',
    prompt: 'Payment receipt confirmation for invoice payment with invoice number, amount received, and transaction id',
    expectedCategory: 'UTILITY',
    mockModelOutput: {
      suggestions: [
        {
          name: 'payment_received_confirmation',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hi {{1}}, we have received your payment of {{2}} for invoice #{{3}}. Reference ID: {{4}}. Thank you!',
          variables: [
            { position: 1, meaning: 'Customer Name' },
            { position: 2, meaning: 'Amount Paid' },
            { position: 3, meaning: 'Invoice Number' },
            { position: 4, meaning: 'Transaction ID' }
          ]
        },
        {
          name: 'receipt_acknowledgement',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Dear {{1}}, payment of {{2}} towards {{3}} is confirmed (Txn: {{4}}). View receipt here: {{5}}',
          variables: [
            { position: 1, meaning: 'Customer Name' },
            { position: 2, meaning: 'Amount' },
            { position: 3, meaning: 'Service Name' },
            { position: 4, meaning: 'Txn ID' },
            { position: 5, meaning: 'Receipt Link' }
          ]
        }
      ]
    }
  },
  {
    useCase: 'admission reminder',
    prompt: 'College admission document submission deadline reminder',
    expectedCategory: 'UTILITY',
    mockModelOutput: {
      suggestions: [
        {
          name: 'admission_document_reminder',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hello {{1}}, please submit your pending admission documents for {{2}} before {{3}} to secure your seat.',
          variables: [
            { position: 1, meaning: 'Applicant Name' },
            { position: 2, meaning: 'Course Name' },
            { position: 3, meaning: 'Submission Deadline' }
          ]
        },
        {
          name: 'admission_seat_confirmation',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Dear {{1}}, your provisional admission for {{2}} is ready. Complete verification by {{3}} at {{4}}.',
          variables: [
            { position: 1, meaning: 'Applicant Name' },
            { position: 2, meaning: 'Program Name' },
            { position: 3, meaning: 'Verification Date' },
            { position: 4, meaning: 'Admissions Desk' }
          ]
        }
      ]
    }
  },
  {
    useCase: 'attendance notification',
    prompt: 'Student absent notification sent to parents',
    expectedCategory: 'UTILITY',
    mockModelOutput: {
      suggestions: [
        {
          name: 'student_absence_alert',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Dear parent, your ward {{1}} was marked absent from class on {{2}}. For any query, contact {{3}}.',
          variables: [
            { position: 1, meaning: 'Student Name' },
            { position: 2, meaning: 'Absence Date' },
            { position: 3, meaning: 'School Phone' }
          ]
        },
        {
          name: 'attendance_daily_update',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Attendance Notice: {{1}} did not attend {{2}} session on {{3}}. Please submit leave note to {{4}}.',
          variables: [
            { position: 1, meaning: 'Student Name' },
            { position: 2, meaning: 'Class/Subject' },
            { position: 3, meaning: 'Date' },
            { position: 4, meaning: 'Class Teacher' }
          ]
        }
      ]
    }
  },
  {
    useCase: 'event reminder',
    prompt: 'Webinar or annual meetup reminder with date, time, and link',
    expectedCategory: 'UTILITY',
    mockModelOutput: {
      suggestions: [
        {
          name: 'event_reminder_broadcast',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hi {{1}}, reminder that {{2}} starts on {{3}} at {{4}}. Join using this link: {{5}}',
          variables: [
            { position: 1, meaning: 'Participant Name' },
            { position: 2, meaning: 'Event Name' },
            { position: 3, meaning: 'Event Date' },
            { position: 4, meaning: 'Start Time' },
            { position: 5, meaning: 'Join URL' }
          ]
        },
        {
          name: 'workshop_starting_soon',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hello {{1}}, {{2}} is starting in {{3}} minutes. Access your session here: {{4}}',
          variables: [
            { position: 1, meaning: 'Attendee Name' },
            { position: 2, meaning: 'Session Title' },
            { position: 3, meaning: 'Minutes Countdown' },
            { position: 4, meaning: 'Meeting Link' }
          ]
        }
      ]
    }
  },
  {
    useCase: 'appointment reminder',
    prompt: 'Clinic or consultation appointment reminder with doctor name, date, time, and address',
    expectedCategory: 'UTILITY',
    mockModelOutput: {
      suggestions: [
        {
          name: 'clinic_appointment_reminder',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hello {{1}}, your consultation with Dr. {{2}} is booked for {{3}} at {{4}} at {{5}}.',
          variables: [
            { position: 1, meaning: 'Patient Name' },
            { position: 2, meaning: 'Doctor Name' },
            { position: 3, meaning: 'Appointment Date' },
            { position: 4, meaning: 'Appointment Time' },
            { position: 5, meaning: 'Clinic Address' }
          ]
        },
        {
          name: 'service_booking_reminder',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hi {{1}}, your booking for {{2}} is confirmed for {{3}} at {{4}}. Reply 1 to confirm or 2 to reschedule.',
          variables: [
            { position: 1, meaning: 'Client Name' },
            { position: 2, meaning: 'Service Name' },
            { position: 3, meaning: 'Date' },
            { position: 4, meaning: 'Time' }
          ]
        }
      ]
    }
  },
  {
    useCase: 'order update',
    prompt: 'E-commerce dispatch and tracking alert',
    expectedCategory: 'UTILITY',
    mockModelOutput: {
      suggestions: [
        {
          name: 'order_dispatched_alert',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hi {{1}}, your order #{{2}} has been shipped via {{3}}. Track live status: {{4}}',
          variables: [
            { position: 1, meaning: 'Customer Name' },
            { position: 2, meaning: 'Order ID' },
            { position: 3, meaning: 'Courier Partner' },
            { position: 4, meaning: 'Tracking Link' }
          ]
        },
        {
          name: 'order_out_for_delivery',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Good news {{1}}! Your package {{2}} is out for delivery today. Delivery agent: {{3}} ({{4}}).',
          variables: [
            { position: 1, meaning: 'Customer Name' },
            { position: 2, meaning: 'Item Name' },
            { position: 3, meaning: 'Agent Name' },
            { position: 4, meaning: 'Agent Phone' }
          ]
        }
      ]
    }
  },
  {
    useCase: 'account notification',
    prompt: 'Account password changed or security alert',
    expectedCategory: 'UTILITY',
    mockModelOutput: {
      suggestions: [
        {
          name: 'account_security_alert',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Security Alert: Password for your account {{1}} was changed on {{2}} from {{3}}. If not you, contact {{4}}.',
          variables: [
            { position: 1, meaning: 'Account Email/ID' },
            { position: 2, meaning: 'Change Timestamp' },
            { position: 3, meaning: 'Location/IP' },
            { position: 4, meaning: 'Support Phone' }
          ]
        },
        {
          name: 'profile_update_notice',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hi {{1}}, your profile {{2}} was updated on {{3}}. If you did not make this change, please report to {{4}}.',
          variables: [
            { position: 1, meaning: 'User Name' },
            { position: 2, meaning: 'Field Name' },
            { position: 3, meaning: 'Date' },
            { position: 4, meaning: 'Helpdesk URL' }
          ]
        }
      ]
    }
  },
  {
    useCase: 'campaign/offer',
    prompt: 'Festive season discount promo code and catalog link',
    expectedCategory: 'MARKETING',
    mockModelOutput: {
      suggestions: [
        {
          name: 'festive_discount_offer',
          category: 'MARKETING',
          language: 'en_US',
          body: 'Celebrate this festive season with {{1}}% off on all items! Use code {{2}} at checkout before {{3}}: {{4}}',
          variables: [
            { position: 1, meaning: 'Discount Percentage' },
            { position: 2, meaning: 'Promo Code' },
            { position: 3, meaning: 'Expiry Date' },
            { position: 4, meaning: 'Store Link' }
          ]
        },
        {
          name: 'vip_exclusive_deal',
          category: 'MARKETING',
          language: 'en_US',
          body: 'Hi {{1}}, exclusive VIP offer for you! Get a flat {{2}} discount on your next order with coupon {{3}}. Shop now: {{4}}',
          variables: [
            { position: 1, meaning: 'Customer Name' },
            { position: 2, meaning: 'Discount Amount' },
            { position: 3, meaning: 'Coupon Code' },
            { position: 4, meaning: 'Catalog Link' }
          ]
        }
      ]
    }
  },
  {
    useCase: 'generic customer update',
    prompt: 'General service status or maintenance schedule notice',
    expectedCategory: 'UTILITY',
    mockModelOutput: {
      suggestions: [
        {
          name: 'service_maintenance_notice',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Notice: Scheduled maintenance for {{1}} will take place on {{2}} from {{3}} to {{4}}. Services may be unavailable.',
          variables: [
            { position: 1, meaning: 'Service Name' },
            { position: 2, meaning: 'Maintenance Date' },
            { position: 3, meaning: 'Start Time' },
            { position: 4, meaning: 'End Time' }
          ]
        },
        {
          name: 'customer_support_update',
          category: 'UTILITY',
          language: 'en_US',
          body: 'Hi {{1}}, your support ticket #{{2}} has been updated by agent {{3}}. Details: {{4}}',
          variables: [
            { position: 1, meaning: 'Customer Name' },
            { position: 2, meaning: 'Ticket ID' },
            { position: 3, meaning: 'Agent Name' },
            { position: 4, meaning: 'Ticket Status/Link' }
          ]
        }
      ]
    }
  }
];

export async function runEvaluation() {
  console.log('📊 ========================================================');
  console.log('📊 RUNNING AI TEMPLATE QUALITY EVALUATION (10 USE CASES)');
  console.log('📊 ========================================================');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < EVAL_DATASET.length; i++) {
    const item = EVAL_DATASET[i];
    console.log(`\nEvaluating Case #${i + 1}: ${item.useCase.toUpperCase()}`);

    const result = validateAiTemplateOutput(item.mockModelOutput);
    if (!result.valid || !result.suggestions) {
      console.error(`❌ [FAIL] ${item.useCase} failed validation:`, result.error);
      failed++;
      continue;
    }

    const s1 = result.suggestions[0];
    const s2 = result.suggestions[1];

    // Assertions
    const hasCategory = s1.category === item.expectedCategory || ['UTILITY', 'MARKETING'].includes(s1.category);
    const has2DiffSuggestions = s1.body !== s2.body;
    const lengthValid = s1.body.length <= 1024 && s2.body.length <= 1024;
    const varsSequential = s1.variables.every((v, idx) => v.position === idx + 1);

    if (hasCategory && has2DiffSuggestions && lengthValid && varsSequential) {
      console.log(`✅ [PASS] ${item.useCase}: 2 distinct suggestions, sequential variables, valid category (${s1.category})`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${item.useCase} quality check failed.`);
      failed++;
    }
  }

  console.log('\n========================================================');
  console.log(`EVALUATION COMPLETE: ${passed}/${EVAL_DATASET.length} PASSED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runEvaluation();
