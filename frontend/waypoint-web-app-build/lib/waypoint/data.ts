import type { LifeEvent, Plan } from './types'

export const LIFE_EVENTS: LifeEvent[] = [
  {
    id: 'death',
    title: 'Death of a family member',
    description:
      'What to do first, which papers you will need, and who to tell — one step at a time.',
    questions: [
      {
        id: 'relationship',
        prompt: 'What was your relationship to the person?',
        options: [
          { value: 'spouse', label: 'Spouse or partner' },
          { value: 'child', label: 'Son or daughter' },
          { value: 'parent', label: 'Parent' },
          { value: 'other', label: 'Other relative or friend' },
        ],
      },
      {
        id: 'place',
        prompt: 'Where did the death happen?',
        options: [
          { value: 'facility', label: 'In a hospital or care home' },
          { value: 'home_expected', label: 'At home, under hospice care' },
          { value: 'home_unexpected', label: 'At home, unexpectedly' },
          { value: 'elsewhere', label: 'Somewhere else' },
        ],
      },
      {
        id: 'will',
        prompt: 'Did they leave a will?',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'unsure', label: "I'm not sure" },
        ],
      },
      {
        id: 'executor',
        prompt: 'Are you the executor or main person handling things?',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No, someone else is' },
          { value: 'unsure', label: 'Not decided yet' },
        ],
      },
    ],
  },
  {
    id: 'lost_documents',
    title: 'Lost wallet or documents',
    description:
      'Protect your accounts, report the loss, and replace your ID and cards in the right order.',
    questions: [
      {
        id: 'what_lost',
        prompt: 'What did you lose?',
        options: [
          { value: 'wallet', label: 'Wallet with cards and ID' },
          { value: 'passport', label: 'Passport' },
          { value: 'license', label: "Driver's license only" },
          { value: 'several', label: 'Several documents' },
        ],
      },
      {
        id: 'stolen',
        prompt: 'Do you think it was stolen?',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No, I misplaced it' },
          { value: 'unsure', label: "I'm not sure" },
        ],
      },
      {
        id: 'abroad',
        prompt: 'Are you currently traveling abroad?',
        options: [
          { value: 'no', label: 'No, I am at home' },
          { value: 'yes', label: 'Yes, I am abroad' },
        ],
      },
    ],
  },
]

export function getLifeEvent(id: string) {
  return LIFE_EVENTS.find((event) => event.id === id)
}

export const SAMPLE_DEATH_PLAN: Plan = {
  tier: 'supported',
  event: 'death',
  steps: [
    {
      order: 1,
      id: 'pronouncement',
      title: 'Get a legal pronouncement of death',
      explanation:
        'A doctor, hospice nurse, or coroner must officially confirm the death before anything else can happen. In a hospital or care home, staff usually handle this for you.',
      why_now:
        'Nothing else — moving the person, the funeral, or the death certificate — can begin until the death is formally pronounced.',
      documents: [
        "The person's full legal name and date of birth",
        'Their doctor or hospice contact, if known',
      ],
      where: 'Hospital or care staff, hospice nurse, or local emergency services (911) if unexpected',
      time: 'Within a few hours',
      fee: 'Free',
      depends_on: [],
      source_url: 'https://www.usa.gov/when-someone-dies',
      last_verified: '2026-09-14',
    },
    {
      order: 2,
      id: 'funeral-home',
      title: 'Contact a funeral home',
      explanation:
        'The funeral home transports the person, helps you plan services, and usually files the death certificate with the local registrar on your behalf.',
      why_now:
        'They need to collect the person soon, and they start the paperwork that produces the death certificate.',
      documents: [
        'Pronouncement of death or hospital release form',
        "Person's Social Security number",
        "Parents' names, including mother's maiden name",
      ],
      where: 'A licensed funeral home of your choice — ask for an itemized price list',
      time: 'Within 24 hours',
      fee: 'Varies widely; ask for the General Price List',
      depends_on: ['pronouncement'],
      source_url: 'https://consumer.ftc.gov/articles/shopping-funeral-services',
      last_verified: '2026-09-02',
    },
    {
      order: 3,
      id: 'will-papers',
      title: 'Find the will and key papers',
      explanation:
        'Look for the will, any written funeral wishes, insurance policies, and a list of bank accounts. These tell you who the executor is and how many certificates you will need.',
      why_now:
        'The will may contain burial or cremation wishes, and knowing the accounts helps you order the right number of death certificates in one go.',
      documents: [
        'Original will (or the lawyer who holds it)',
        'Life insurance policies',
        'Recent bank and pension statements',
      ],
      where: "At home, in a safe-deposit box, or with the person's lawyer",
      time: 'Within the first week',
      fee: 'Free',
      depends_on: ['pronouncement'],
      source_url: 'https://www.usa.gov/when-someone-dies',
      last_verified: '2026-09-14',
    },
    {
      order: 4,
      id: 'death-certificates',
      title: 'Order certified death certificates',
      explanation:
        'Banks, insurers, and government offices each ask for an official certified copy. Ordering several at once through the funeral home is usually easiest.',
      why_now:
        'Almost every remaining task needs a certified copy, and processing can take one to two weeks.',
      documents: [
        'Proof of your relationship to the person',
        'Your photo ID',
        'Count of accounts and policies from step 3',
      ],
      where: 'Through the funeral home, or the county or state vital records office',
      time: '1–2 weeks to arrive',
      fee: 'About $10–$30 per copy, depending on your state',
      depends_on: ['funeral-home', 'will-papers'],
      source_url: 'https://www.cdc.gov/nchs/w2w/index.htm',
      last_verified: '2026-08-21',
    },
    {
      order: 5,
      id: 'notify-institutions',
      title: 'Notify banks and benefit providers',
      explanation:
        'Tell Social Security, banks, pension providers, and insurers about the death. Some accounts will be frozen until the executor is confirmed; others can pay out directly.',
      why_now:
        'Payments made after the death may need to be returned, and early notice helps prevent identity theft.',
      documents: [
        'Certified death certificate',
        "Person's Social Security number and account numbers",
        'Will or letter showing you are the executor, if applicable',
      ],
      where: 'Social Security (1-800-772-1213), each bank branch, and insurers by phone',
      time: 'Within 2–4 weeks',
      fee: 'Free',
      depends_on: ['death-certificates'],
      source_url: 'https://www.ssa.gov/benefits/survivors/',
      last_verified: '2026-09-30',
    },
  ],
}
