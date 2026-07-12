// Convert number to Indian English words (for invoice amount in words)
// e.g. 9440 → "Nine Thousand Four Hundred Forty Rupees"

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function twoDigits(n: number): string {
  if (n < 20) return ones[n]
  return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
}

function threeDigits(n: number): string {
  let str = ""
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + " Hundred"
    n = n % 100
    if (n > 0) str += " "
  }
  if (n > 0) str += twoDigits(n)
  return str
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero Rupees"

  let result = ""
  let isNegative = false

  if (num < 0) {
    isNegative = true
    num = Math.abs(num)
  }

  // Handle decimals (paise)
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)

  // Crores
  if (rupees >= 10000000) {
    result += threeDigits(Math.floor(rupees / 10000000)) + " Crore "
  }
  const afterCrore = rupees % 10000000

  // Lakhs
  if (afterCrore >= 100000) {
    result += threeDigits(Math.floor(afterCrore / 100000)) + " Lakh "
  }
  const afterLakh = afterCrore % 100000

  // Thousands
  if (afterLakh >= 1000) {
    result += threeDigits(Math.floor(afterLakh / 1000)) + " Thousand "
  }
  const afterThousand = afterLakh % 1000

  // Hundreds + tens + ones
  if (afterThousand > 0) {
    result += threeDigits(afterThousand)
  }

  result = result.trim()

  if (paise > 0) {
    result += " Rupees and " + twoDigits(paise) + " Paise"
  } else {
    result += " Rupees"
  }

  if (isNegative) result = "Minus " + result

  return result
}
