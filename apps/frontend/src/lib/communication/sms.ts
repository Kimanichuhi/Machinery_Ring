export type RecipientFilterType =
  | 'all_farmers'
  | 'local_mr'
  | 'ward'
  | 'village'
  | 'tot'
  | 'farmer'
  | 'potato_farmers'
  | 'dairy_farmers'
  | 'poultry_farmers'
  | 'vegetable_farmers'
  | 'machinery_bookings'
  | 'training_attendees'
  | 'custom_numbers';

export type SmsRecipient = {
  id: string;
  name: string;
  phone: string;
  localMr?: string;
  ward?: string;
  village?: string;
};

export type SmsDraft = {
  title: string;
  content: string;
  recipients: SmsRecipient[];
  maxLength?: number;
};

export type SmsValidationResult = {
  valid: boolean;
  errors: string[];
  duplicatePhones: string[];
  invalidPhones: string[];
};

const KENYAN_PHONE_REGEX = /^(?:\+254|254|0)?(7|1)\d{8}$/;

export function normalizePhoneNumber(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');

  if (digits.startsWith('254') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }

  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) {
    return `+254${digits}`;
  }

  return phone.trim();
}

export function isValidPhoneNumber(phone: string) {
  return KENYAN_PHONE_REGEX.test(phone.replace(/\s/g, ''));
}

export function getSmsPartCount(content: string) {
  if (!content) return 0;
  return Math.ceil(content.length / 160);
}

export function estimateSmsCost(content: string, recipientCount: number, costPerPart = 1) {
  return getSmsPartCount(content) * recipientCount * costPerPart;
}

export function renderTemplate(template: string, variables: Record<string, string | number | null | undefined>) {
  return template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_match, key) => {
    const value = variables[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

export function validateSmsDraft(draft: SmsDraft): SmsValidationResult {
  const errors: string[] = [];
  const maxLength = draft.maxLength || 918;
  const seen = new Set<string>();
  const duplicatePhones: string[] = [];
  const invalidPhones: string[] = [];

  if (!draft.title.trim()) {
    errors.push('Message title is required.');
  }

  if (!draft.content.trim()) {
    errors.push('SMS content is required.');
  }

  if (draft.content.length > maxLength) {
    errors.push(`SMS content must be ${maxLength} characters or fewer.`);
  }

  if (draft.recipients.length === 0) {
    errors.push('Select at least one recipient.');
  }

  draft.recipients.forEach((recipient) => {
    const normalized = normalizePhoneNumber(recipient.phone);

    if (!isValidPhoneNumber(normalized)) {
      invalidPhones.push(recipient.phone);
      return;
    }

    if (seen.has(normalized)) {
      duplicatePhones.push(normalized);
      return;
    }

    seen.add(normalized);
  });

  if (invalidPhones.length > 0) {
    errors.push(`${invalidPhones.length} recipient phone number(s) are invalid.`);
  }

  if (duplicatePhones.length > 0) {
    errors.push(`${duplicatePhones.length} duplicate recipient phone number(s) found.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    duplicatePhones,
    invalidPhones,
  };
}

export const defaultSmsTemplates = [
  {
    name: 'Training Reminder',
    category: 'Training',
    content: 'Hello {{farmer_name}}, reminder: training is on {{date}} at {{time}} in {{training_location}}. Machinery Ring Nyandarua.',
  },
  {
    name: 'Machinery Booking',
    category: 'Machinery',
    content: 'Hello {{farmer_name}}, your machinery booking is confirmed for {{date}} at {{time}}. Machinery Ring Nyandarua.',
  },
  {
    name: 'Weather Update',
    category: 'Weather',
    content: 'Weather update for {{local_mr}}: {{weather}}, temperature {{temperature}}. Plan spraying and machinery work accordingly.',
  },
  {
    name: 'Payment Reminder',
    category: 'Finance',
    content: 'Hello {{farmer_name}}, kindly complete your pending payment by {{date}}. Machinery Ring Nyandarua.',
  },
  {
    name: 'Meeting Invitation',
    category: 'Meeting',
    content: 'Hello {{farmer_name}}, you are invited to a Machinery Ring meeting on {{date}} at {{time}}.',
  },
  {
    name: 'Emergency Alert',
    category: 'Alert',
    content: 'Emergency alert for {{local_mr}}: {{weather}}. Follow field safety guidance and avoid risky operations.',
  },
  {
    name: 'General Announcement',
    category: 'Announcement',
    content: 'Hello {{farmer_name}}, {{local_mr}} announcement: ',
  },
  {
    name: 'Seasonal Advice',
    category: 'Advisory',
    content: 'Seasonal advice: {{weather}} expected. Recommendations: planting, spraying, dairy, and machinery schedules should be reviewed.',
  },
];
