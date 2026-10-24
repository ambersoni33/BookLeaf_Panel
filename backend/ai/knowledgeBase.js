/**
 * BookLeaf Publishing Platform - Modular Knowledge Base & Operating Policies
 * Calibrated against BookLeaf Support benchmarks to deliver human-grade,
 * empathetic, and operationally precise responses.
 */

export const COMMON_TONE_GUIDELINES = `
## Communication Tone & Empathy Guidelines:
1. Empathetic and Professional: Authors are our creative partners. Validate their concern, emotional investment, and frustration first before explaining policies.
2. Concrete Details: Quote specific figures, book titles, sales numbers, net profit formulas, and calendar dates. Never use vague generalities.
3. Total Transparency & No Defensiveness: If a calculation is questioned or a delay occurred, explain the mechanics openly without deflection or excuses.
4. Actionable Next Steps: Always conclude with an actionable resolution timeline (e.g., "within 24-48 hours", "within 2 business days", or "within 5-7 business days").
5. Real Human Voice: Sound like an empathetic, seasoned BookLeaf support representative—never sound like a robotic AI assistant or boilerplate auto-responder.
`;

/**
 * Royalty & Payments Knowledge Domain (Isolated Context)
 */
export const ROYALTY_KNOWLEDGE = `
# BookLeaf Royalty & Payments Policy
- Royalty Split: 80/20 profit split (80% of net profit goes to author, 20% to BookLeaf).
- Net Profit Calculation: Net Profit = MRP minus Printing Cost, Platform Commission (Amazon/Flipkart charge ~40% to 50%), and Shipping Charges. Author receives 80% of this net profit.
- Payout Schedule: Calculated quarterly and disbursed within 45 days of quarter ending:
  • Q1 (Jan-Mar): Disbursed by May 15
  • Q2 (Apr-Jun): Disbursed by Aug 15
  • Q3 (Jul-Sep): Disbursed by Nov 15
  • Q4 (Oct-Dec): Disbursed by Feb 15
- Minimum Payout Threshold: ₹1,000 INR. If accumulated royalties in a cycle are below ₹1,000, they automatically roll over to the subsequent quarter.
- Bank Account Linking: Royalties are paid via direct NEFT/RTGS bank transfer. Authors must have valid bank account and IFSC details linked in their Author Dashboard.
- Dashboard Visibility: Authors can view real-time sales counts and pending/paid royalty figures in their BookLeaf portal.
- Overdue Resolution: If payout is delayed past the 45-day window, our finance team performs an expedited 48-hour audit and initiates batch NEFT transfer.
`;

/**
 * ISBN & Metadata Issues Knowledge Domain (Isolated Context)
 */
export const ISBN_METADATA_KNOWLEDGE = `
# BookLeaf ISBN & Metadata Policy
- Assignment: Every book published through BookLeaf receives a unique, registered ISBN assigned under the official BookLeaf publisher imprint.
- Custom Imprint: Authors wishing to publish under a personal imprint must register their own ISBN independently.
- ISBN Discrepancies: If physical book has a different ISBN than Amazon/Flipkart or wrong book title/author is linked, it is a CRITICAL catalog data integrity issue.
- Resolution Protocol: Escalated immediately to the Production & Metadata Lead. An emergency catalog re-ingest and rectification request is filed with Amazon/Flipkart support within 24 to 48 hours.
- Author Bio & Description Updates: Changes to author bio, book description, or categories can be submitted via the dashboard or email and reflect across digital platforms within 3 to 5 business days.
`;

/**
 * Printing & Quality Guarantee Knowledge Domain (Isolated Context)
 */
export const PRINTING_QUALITY_KNOWLEDGE = `
# BookLeaf Printing & Quality Guarantee
- Printing Facilities: In-house digital print facility & central warehouse in Delhi, India, with offset partners Repro India and Epitome Books.
- Production Turnaround: Standard author copies print turnaround is 5 to 7 business days from order placement.
- 100% Free Replacement Quality Guarantee: If an author receives copies with manufacturing defects (blurry images, misaligned pages, broken spine/binding, smeared ink, cut-off text, or cover color distortion), BookLeaf provides 100% free reprint replacement.
- Verification Process: The author is asked to share clear photos or videos of the defective copies.
- Turnaround: Once defect photos are received, an expedited reprint is scheduled immediately and dispatched within 5 to 7 business days with priority courier tracking.
`;

/**
 * Distribution & Availability Knowledge Domain (Isolated Context)
 */
export const DISTRIBUTION_KNOWLEDGE = `
# BookLeaf Distribution & Marketplace Availability Policy
- Retail Distribution Channels: Amazon India, Flipkart, BookLeaf Online Store, Amazon US, and Amazon UK.
- Go-Live Timeline: New listings reflect across online channels within 7 to 10 business days after publication release.
- Stock Sync & Out-of-Stock Latency: If a published title shows "Currently Unavailable" or out-of-stock on Amazon or Flipkart, it is usually an automated inventory API sync latency between warehouse systems and the marketplace algorithm, NOT a delisting.
- Urgent Resolution: Our distribution desk triggers an immediate manual catalog inventory re-sync with Amazon/Flipkart vendor operations. Listings typically restore to in-stock within 24 to 48 hours.
- Prime Badge: Prime eligibility depends on marketplace fulfillment center inventory allocation, dispatched from our Delhi warehouse.
`;

/**
 * Book Status & Production Stages Knowledge Domain (Isolated Context)
 */
export const PRODUCTION_STATUS_KNOWLEDGE = `
# BookLeaf Production Stages & Turnaround Policy
- Sequential 9 Production Stages:
  1. Manuscript Received
  2. Editing & Structural Proof (if opted)
  3. Cover Design (requires author sign-off)
  4. Typesetting & Interior Layout
  5. Proofreading & Galley Review (author revision rounds)
  6. ISBN Assignment & Barcode Generation
  7. Printing & Initial Quality Check
  8. Distribution Setup & Metadata Ingestion
  9. Published & Live
- Collaborative Progress: Delays typically occur during Cover Design feedback, intricate interior typography, or author revision rounds. We address authors collaboratively as creative partners without placing blame even if delays were on their side.
- Actionable Next Steps: Specify the current active stage, explain the cause of delay honestly, and guarantee delivery of updated galley proofs within 2 business days.
`;

/**
 * General Inquiry Knowledge Domain (Isolated Context)
 */
export const GENERAL_KNOWLEDGE = `
# BookLeaf General Inquiry & Author Services Policy
- Publishing Packages:
  • Standard Free: 100% free publishing, ISBN, online distribution, 80% royalty.
  • Bestseller Breakthrough: Premium marketing, bespoke cover design, PR campaigns, enhanced distribution.
- Author Portal: Access sales dashboards, royalty statements, author copies ordering, and project status 24/7.
- Metadata Updates: Authors can update book descriptions, author bios, or genre categories anytime through the dashboard or by emailing the BookLeaf team. Updates reflect on retail platforms within 3 to 5 business days.
- Account Assistance: Guidance on marketing author copies, updating contact/payment details, and future manuscript submissions.
`;

export const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
