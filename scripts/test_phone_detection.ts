import { isValidPhoneNumber, normalizePhoneNumber, detectPhoneColumn } from '../src/lib/phone';
import { evaluateExcelRecipients } from '../src/app/(app)/campaigns/_components/ExcelUploader';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
}

console.log('🧪 Testing Authoritative Phone Normalization & Validation...');

// 1. Phone validation tests
assert(isValidPhoneNumber('9876543210'), '10-digit Indian mobile is valid');
assert(isValidPhoneNumber('919876543210'), '12-digit Indian mobile with 91 prefix is valid');
assert(isValidPhoneNumber('+919876543210'), '+91 prefixed number is valid');
assert(isValidPhoneNumber('+91 98765 43210'), 'Number with spaces is normalized and valid');
assert(isValidPhoneNumber('14155552671'), '11-digit international number is valid');

// Invalid non-phone numbers
assert(!isValidPhoneNumber('10'), 'Numeric 10 is NOT a phone number');
assert(!isValidPhoneNumber('8'), 'Numeric 8 is NOT a phone number');
assert(!isValidPhoneNumber('12'), 'Numeric 12 is NOT a phone number');
assert(!isValidPhoneNumber('12345678'), '8-digit number is NOT a valid phone number');
assert(!isValidPhoneNumber(''), 'Empty string is NOT a phone number');
assert(!isValidPhoneNumber('abc'), 'Text string is NOT a phone number');

console.log('\n🧪 Testing Phone Column Auto-Detection Scenarios...');

// Scenario A: Proper header "Phone Number"
{
  const headers = ['Name', 'Phone Number', 'Fee'];
  const matrix = [
    ['Rahul', '919876543210', '2500'],
    ['Amit', '919876543211', '1800']
  ];
  const { detectedHeader, confidence } = detectPhoneColumn(headers, matrix, true);
  assert(detectedHeader === 'Phone Number', 'Scenario A: Detects "Phone Number" header');
  assert(confidence === 'high', 'Scenario A: High confidence');
}

// Scenario B: Header "Mobile" with 10-digit numbers
{
  const headers = ['Name', 'Mobile', 'Fee'];
  const matrix = [
    ['Rahul', '9876543210', '2500'],
    ['Amit', '9876543211', '1800']
  ];
  const { detectedHeader } = detectPhoneColumn(headers, matrix, true);
  assert(detectedHeader === 'Mobile', 'Scenario B: Detects "Mobile" header');
}

// Scenario C: Header "phone_no"
{
  const headers = ['Name', 'phone_no', 'Fee'];
  const matrix = [
    ['Rahul', '9876543210', '2500'],
    ['Amit', '9876543211', '1800']
  ];
  const { detectedHeader } = detectPhoneColumn(headers, matrix, true);
  assert(detectedHeader === 'phone_no', 'Scenario C: Detects "phone_no" header');
}

// Scenario D: No phone header, but valid 10-digit data
{
  const headers = ['Name', 'Col_2', 'Col_3'];
  const matrix = [
    ['Rahul', '9876543210', '2500'],
    ['Amit', '9876543211', '1800']
  ];
  const { detectedHeader } = detectPhoneColumn(headers, matrix, true);
  assert(detectedHeader === 'Col_2', 'Scenario D: Fallback data-based detection finds Col_2');
}

// Scenario E: No phone header, valid 12-digit 91XXXXXXXXXX data
{
  const headers = ['Name', 'Custom_Field', 'Amount'];
  const matrix = [
    ['Rahul', '919876543210', '2500'],
    ['Amit', '919876543211', '1800']
  ];
  const { detectedHeader } = detectPhoneColumn(headers, matrix, true);
  assert(detectedHeader === 'Custom_Field', 'Scenario E: Fallback data-based detection finds 12-digit column');
}

// Scenario F: No phone header, invalid numeric data (10, 8, 12) -> MUST NOT be detected as phone
{
  const headers = ['Student', 'Age', 'Roll'];
  const matrix = [
    ['10', '15', '101'],
    ['8', '14', '102'],
    ['12', '16', '103']
  ];
  const { confidence } = detectPhoneColumn(headers, matrix, true);
  assert(confidence === 'none', 'Scenario F: Short numeric data (10, 8, 12) is NOT recognized as phone');
}

// Scenario H (The exact bug reported): Student column (10, 8, 12) + Phone Number column (919876...)
{
  const headers = ['Name', 'Student', 'Phone Number', 'Fee'];
  const matrix = [
    ['Rahul', '10', '919876543210', '2500'],
    ['Amit', '8', '919762050777', '1800'],
    ['Neha', '12', '919876543212', '3200']
  ];
  const { detectedHeader, confidence } = detectPhoneColumn(headers, matrix, true);
  assert(detectedHeader === 'Phone Number', 'Scenario H: "Phone Number" wins over "Student" (10, 8, 12)');
  assert(confidence === 'high', 'Scenario H: High confidence for "Phone Number"');

  const evaluated = evaluateExcelRecipients(headers, matrix, detectedHeader);
  assert(evaluated.validPhoneCount === 3, 'Scenario H: 3 valid recipients evaluated');
  assert(evaluated.rows[0]._phone === '919876543210', 'Scenario H: Correct normalized phone for Rahul');
  assert(evaluated.rows[1]._phone === '919762050777', 'Scenario H: Correct normalized phone for Amit');
}

// Scenario G: Multiple valid phone columns & switching
{
  const headers = ['Name', 'Phone Number', 'Alternate Phone', 'Fee'];
  const matrix = [
    ['Rahul', '919876543210', '919111111111', '2500'],
    ['Amit', '919876543211', '919222222222', '1800']
  ];
  const { detectedHeader } = detectPhoneColumn(headers, matrix, true);
  assert(detectedHeader === 'Phone Number', 'Scenario G: Default selects first primary phone column');

  // Switch to Alternate Phone
  const evaluatedAlt = evaluateExcelRecipients(headers, matrix, 'Alternate Phone');
  assert(evaluatedAlt.validPhoneCount === 2, 'Scenario G: Revalidation works on Alternate Phone');
  assert(evaluatedAlt.rows[0]._phone === '919111111111', 'Scenario G: Alternate Phone value resolved correctly');
}

// Scenario I: Phone column with blank rows
{
  const headers = ['Name', 'Phone', 'Fee'];
  const matrix = [
    ['Rahul', '919876543210', '2500'],
    ['Ghost', '', '0'],
    ['Amit', '919876543211', '1800']
  ];
  const evaluated = evaluateExcelRecipients(headers, matrix, 'Phone');
  assert(evaluated.validPhoneCount === 2, 'Scenario I: Skips blank row without crashing');
  assert(evaluated.invalidPhoneCount === 0, 'Scenario I: Blank row is cleanly ignored');
}

// Scenario J: Mixed valid/invalid values in phone column
{
  const headers = ['Name', 'Phone', 'Fee'];
  const matrix = [
    ['Rahul', '919876543210', '2500'],
    ['BadRow', '123', '0'], // invalid 3 digits
    ['Amit', '919876543211', '1800']
  ];
  const evaluated = evaluateExcelRecipients(headers, matrix, 'Phone');
  assert(evaluated.validPhoneCount === 2, 'Scenario J: Counts only 2 valid phone rows');
  assert(evaluated.invalidPhoneCount === 1, 'Scenario J: Tracks 1 invalid row');
  assert(evaluated.rows.length === 2, 'Scenario J: parsedRows contains only valid recipients');
  assert(evaluated.rows[0]._isPhoneValid === true, 'Scenario J: Row 0 is valid (Rahul)');
  assert(evaluated.rows[1]._isPhoneValid === true, 'Scenario J: Row 1 is valid (Amit)');
}

console.log('\n=========================================');
console.log('All 15 Phone Detection & Revalidation Tests Passed (100%)');
console.log('=========================================\n');
