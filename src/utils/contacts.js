// Numbers and stated availability checked against official UCSB pages on 2026-11-06.
// Each sourceUrl is the verification source; existing portal links live in links.js.
const campusNumbers = 'https://www.hdae.ucsb.edu/contacts/important-numbers'

export const categories = [
  'Campus Safety',
  'Health & Wellness',
  'Technology Support',
  'Academic & Financial Support',
  'Campus Services'
]

export const contacts = [
  {
    id: 'police', name: 'UCSB Police Dispatch (Non-Emergency)', phone: '805-893-3446',
    category: categories[0], description: 'Campus police dispatch for non-emergency assistance.',
    sourceUrl: 'https://www.police.ucsb.edu/'
  }, {
    id: 'care', name: 'CARE Confidential Advocacy Hotline', phone: '805-893-4613',
    category: categories[0], availability: '24/7',
    description: 'Confidential advocacy for survivors of interpersonal violence.',
    sourceUrl: 'https://care.ucsb.edu/about-us/contact-us'
  }, {
    id: 'cso', name: 'CSO Safety Escort', phone: '805-893-2000',
    category: categories[0], availability: '24/7',
    description: 'Request a walking or biking companion on campus or in Isla Vista.',
    sourceUrl: 'https://www.police.ucsb.edu/cso/cso-safety-escorts'
  }, {
    id: 'student-health', name: 'Student Health Service', phone: '805-893-3371',
    category: categories[1], description: 'Contact the clinic for student medical care.',
    sourceUrl: 'https://studenthealth.sa.ucsb.edu/contact-us'
  }, {
    id: 'caps', name: 'CAPS Counseling & Psychological Services', phone: '805-893-4411',
    category: categories[1], availability: '24/7 phone support',
    description: 'Phone support is available around the clock, including after-hours phone counseling.',
    sourceUrl: 'https://caps.sa.ucsb.edu/resources/crisis-assistance'
  }, {
    id: 'student-help', name: 'ITS Student Help Desk', phone: '805-893-4357',
    category: categories[2], description: 'Student support for UCSBnetID, U-Mail, software questions, and printing.',
    sourceUrl: 'https://it.ucsb.edu/services/student-services/help-desk'
  }, {
    id: 'resnet', name: 'ResNet Hotline', phone: '805-893-5555',
    category: categories[2], description: 'Internet and network support for residents in university-owned housing.',
    sourceUrl: 'https://info.resnet.ucsb.edu/support/contact-support'
  }, {
    id: 'dsp', name: 'Disabled Students Program (DSP)', phone: '805-893-2668',
    category: categories[3], description: 'Disability access and support for students.',
    sourceUrl: campusNumbers
  }, {
    id: 'financial-aid', name: 'Financial Aid', phone: '805-893-2432',
    category: categories[3], description: 'Questions about student financial aid and scholarships.',
    sourceUrl: campusNumbers
  }, {
    id: 'registrar', name: 'Registrar', phone: '805-893-3592',
    category: categories[3], description: 'Student registration and academic records assistance.',
    sourceUrl: campusNumbers
  }, {
    id: 'housing', name: 'Housing', phone: '805-893-2760',
    category: categories[4], description: 'Housing main line. Visit the contact page for applications and contracts contacts.',
    sourceUrl: 'https://www.housing.ucsb.edu/contact-us'
  }, {
    id: 'parking', name: 'Transportation & Parking', phone: '805-893-2346',
    category: categories[4], description: 'Campus transportation and parking services.',
    sourceUrl: campusNumbers
  }
]

export function phoneHref(phone) {
  const digits = phone.replace(/\D/g, '')
  return `tel:${digits.length === 10 ? '+1' : ''}${digits}`
}

export function filterContacts(services, query = '', category = '') {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const digits = query.replace(/\D/g, '')
  const isPhoneQuery = digits.length > 0 && /^[\d\s()+.\-]+$/.test(query.trim())
  return services.filter(service => {
    if (category && service.category !== category) return false
    if (isPhoneQuery) {
      const phone = service.phone.replace(/\D/g, '')
      return phone.includes(digits) || (digits.startsWith('1') && `1${phone}`.includes(digits))
    }
    const text = [service.name, service.description, service.category, service.phone,
      service.availability, service.link?.title, service.link?.description].filter(Boolean).join(' ').toLowerCase()
    return terms.every(term => text.includes(term))
  })
}
