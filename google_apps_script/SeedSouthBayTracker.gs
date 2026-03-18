function seedSouthBayTracker() {
  bootstrapWorkbook();

  const controls = [
    ['Budget Min', 3500, 'Lower bound for target net monthly rent per 2B2B unit.'],
    ['Budget Max', 6000, 'Upper bound for target net monthly rent per 2B2B unit.'],
    ['Max Walk Minutes', 25, 'Preferred maximum walk to Caltrain unless a documented shuttle exists.'],
    ['Min Review Score', 3.5, 'Baseline review score target before ranking penalty.'],
    ['Weight Net Cost', 35, 'Priority score weight for net monthly cost.'],
    ['Weight Transit', 25, 'Priority score weight for Caltrain access.'],
    ['Weight Reviews', 20, 'Priority score weight for review quality.'],
    ['Weight SqFt', 10, 'Priority score weight for size.'],
    ['Weight Freshness', 10, 'Priority score weight for verification freshness.'],
    ['Stale After Hours', 72, 'Rows older than this are marked stale by the Apps Script.'],
    ['Decision Window Days', 7, 'Rows older than this should fall out of the active shortlist.'],
    ['Default Lease Term', 12, 'Fallback term for discount normalization when no term is listed.'],
    ['Default Researcher', 'Codex', 'Default owner/researcher name for automated entries.'],
  ];

  const seedSources = [
    ['PDF_CURATED', '/Users/qianli/Downloads/2BD_2BA_Apartment_Recommendations_Near_Palo_Alto.pdf', 'Palo Alto Place', 'Palo Alto', '565 Arastradero Rd, Palo Alto, CA 94306', '~$5,500-$5,640/mo', '1 month free', 'Not within walking distance to Caltrain (~2 miles)', 'Highly positive resident reviews', 'No'],
    ['PDF_CURATED', '/Users/qianli/Downloads/2BD_2BA_Apartment_Recommendations_Near_Palo_Alto.pdf', 'Sevens', 'Mountain View', '777 W Middlefield Rd, Mountain View, CA 94043', '~$5,628/mo', 'Up to 8 weeks free base rent', 'Close to Caltrain (~0.5 miles)', 'Inconsistent maintenance reviews', 'No'],
    ['PDF_CURATED', '/Users/qianli/Downloads/2BD_2BA_Apartment_Recommendations_Near_Palo_Alto.pdf', 'Landsby', 'Mountain View', '2580-2590 California St, Mountain View, CA 94040', '~$5,400+/mo', '4 weeks free on immediate move-ins', 'Very close to San Antonio Caltrain', 'Rated 4.6/5 on Apartments.com', 'No'],
    ['PDF_CURATED', '/Users/qianli/Downloads/2BD_2BA_Apartment_Recommendations_Near_Palo_Alto.pdf', 'Sofi Sunnyvale', 'Sunnyvale', '963 E El Camino Real, Sunnyvale, CA 94087', '~$4,047-$5,358/mo', '30-Day Move-In Satisfaction Guarantee', 'Not within walking distance to Caltrain', 'Excellent staff and maintenance ratings', 'Yes'],
  ];

  const queueRows = [
    ['P1', 'Palo Alto Place', 'Palo Alto', 'PDF_CURATED', 'Confirm live 2B/2B pricing, apply promo normalization, and verify Caltrain walk time versus California Ave or San Antonio.', 'Yes', 'Yes', 'Yes', 'Codex', 'Completed', 'Official Plan C is live; property fails the Caltrain walk threshold and remains in the sheet as a rejected anchor.'],
    ['P1', 'Sevens', 'Mountain View', 'PDF_CURATED', 'Verify the best live 2B/2B floorplan, normalize the 8-week concession, and reconcile the conflicting Caltrain distance claims on the official site.', 'Yes', 'Yes', 'Yes', 'Codex', 'Completed', 'Official price captured from live B2 floorplan page. Transit needs a quick Google Maps sanity check before touring.'],
    ['P1', 'Landsby', 'Mountain View', 'PDF_CURATED', 'Verify the lowest current 2B/2B floorplan, confirm the current address used by the leasing site, and preserve the PDF address as historical context.', 'Yes', 'Yes', 'Yes', 'Codex', 'Completed', 'Official leasing site now uses 100 Aspen Way, while older directories and the PDF still show 2580-2590 California St.'],
    ['P1', 'Sofi Sunnyvale', 'Sunnyvale', 'PDF_CURATED', 'Confirm live 2B/2B pricing directly on the leasing flow, normalize any free-rent offer, and verify Lawrence Caltrain walkability before shortlisting.', 'Yes', 'Partial', 'Yes', 'Codex', 'Partial', 'Official site confirms 2-bedroom inventory but the crawled page did not expose live 2B pricing. Third-party listing data is stored as a watchlist input only.'],
  ];

  const intakeRows = [
    [new Date(2026, 2, 17), 'Codex', 'Apartment Community', 'Palo Alto Place', 'Palo Alto', '565 Arastradero Road, Palo Alto, CA 94306', 'Plan C', 2, 2, 1419, 5600, 0, '2-Weeks free on unit 115; 1-Month free on all other units. Restrictions apply.', 12, 466.67, new Date(2026, 2, 2), 'California Avenue', 2.1, 46, 'No', 3.5, 19, 'Yelp via Yahoo Local', 'Residents praise spacious 2B/2B layouts and responsive maintenance, but repeated complaints mention package theft, break-ins, and inconsistent security follow-through.', 'https://www.paloaltoplace.com/floorplans', 'https://www.apartments.com/565-arastradero-rd-palo-alto-ca-unit-fl3-id275/ggs555x/', 'https://www.apartments.com/565-arastradero-rd-palo-alto-ca-unit-fl3-id275/ggs555x/', 'https://local.yahoo.com/info-198657723-palo-alto-place-palo-alto/', 'PDF_CURATED', 'T1_OFFICIAL', 'REJECTED', new Date(2026, 2, 17, 17, 40), 'Transit timing is inferred from the 2.1-mile commuter-rail distance cited by Apartments.com. Official site verifies the floorplan, price, address, and concession.'],
    [new Date(2026, 2, 17), 'Codex', 'Apartment Community', 'Sevens', 'Mountain View', '777 W. Middlefield Rd, Mountain View, CA 94043', 'B2', 2, 2, 1020, 5703, 29.88, 'Up to 8 Weeks Free Base Rent. Minimum lease term applies.', 15, 760.4, 'Available now', 'Mountain View', '', 15, 'No', 4, 5, 'Yelp via MapQuest', 'Early residents praise the brand-new amenities and service, but the review base is still small and includes at least one complaint about dismissive maintenance handling.', 'https://sevensmv.com/floorplans/b2/', 'https://www.zillow.com/apartments/mountain-view-ca/sevens/5XjLXT/', 'https://sevensmv.com/p/transportation/', 'https://www.mapquest.com/us/california/sevens-770418551', 'PDF_CURATED', 'T1_OFFICIAL', 'VERIFIED', new Date(2026, 2, 17, 17, 43), 'Official pages conflict on Caltrain access: the amenities page markets Mountain View Caltrain as a 15-minute walk, while the transportation page lists Mountain View Station at 1.5 miles and 5 minutes by drive.'],
    [new Date(2026, 2, 17), 'Codex', 'Apartment Community', 'Landsby', 'Mountain View', '100 Aspen Way, Mountain View, CA 94040', '2A.1', 2, 2, 1046, 5373, 114.5, '4 WEEKS FREE. Limited time offer on all homes for immediate move-ins.', 14, 383.79, 'Available now', 'San Antonio', 0.4, 6, 'No', 4.1, 135, 'Google via Chamber of Commerce mirror', 'Amenity and layout feedback is strong, but recurring negative themes include package theft, elevator outages, WhiteSky internet issues, parking scarcity, and management responsiveness.', 'https://livelandsby.com/floorplans/2a-1/', 'https://www.zillow.com/apartments/mountain-view-ca/landsby/C5XT45/', 'https://www.apartments.com/100-aspen-way-mountain-view-ca-unit-id1313476p/84pmqh2/', 'https://www.chamberofcommerce.com/business-directory/california/mountain-view/apartment-rental-agency/2024000090-landsby', 'PDF_CURATED', 'T1_OFFICIAL', 'VERIFIED', new Date(2026, 2, 17, 17, 46), 'The official leasing site uses 100 Aspen Way. Older directories and the PDF still reference 2580-2590 California St for the same community.'],
    [new Date(2026, 2, 17), 'Codex', 'Apartment Community', 'Sofi Sunnyvale', 'Sunnyvale', '963 E El Camino Real, Sunnyvale, CA 94087', '2B2B', 2, 2, 950, 3499, 0, 'Receive up to one month free. Ask about the 30-Day Move-In Satisfaction Guarantee and Renter\\'s Assurance Programs.', 12, 291.58, 'Available now', 'Lawrence', 2.7, '', 'No', 4, 143, 'Google via Birdeye', 'Many residents praise maintenance quality and a quiet community feel, while negative reviews repeatedly cite lease-management issues, price increases, and weaker value relative to amenities.', 'https://www.sofisunnyvale.com/apartments/ca/sunnyvale/floor-plans', 'https://beta.realtor.com/rentals/details/963-E-El-Camino-Real_Sunnyvale_CA_94087_M28786-22693', 'https://www.apartments.com/es/sofi-sunnyvale-sunnyvale-ca/b8tbme9/', 'https://reviews.birdeye.com/sofi-sunnyvale-156747909473053', 'PDF_CURATED', 'T2_MAJOR_LISTING', 'WATCHLIST', new Date(2026, 2, 17, 17, 49), 'The official leasing pages confirm one- and two-bedroom inventory but did not expose live 2B pricing in the crawled page. The listed rent comes from a third-party listing and should be confirmed directly with the leasing flow.'],
  ];

  const auditRows = [
    [new Date(2026, 2, 17, 17, 35), 'SEED_SOURCE_LOADED', 'Seed Sources', 'Palo Alto Place', '', 'Loaded from curated PDF shortlist.', '/Users/qianli/Downloads/2BD_2BA_Apartment_Recommendations_Near_Palo_Alto.pdf'],
    [new Date(2026, 2, 17, 17, 35), 'SEED_SOURCE_LOADED', 'Seed Sources', 'Sevens', '', 'Loaded from curated PDF shortlist.', '/Users/qianli/Downloads/2BD_2BA_Apartment_Recommendations_Near_Palo_Alto.pdf'],
    [new Date(2026, 2, 17, 17, 35), 'SEED_SOURCE_LOADED', 'Seed Sources', 'Landsby', '', 'Loaded from curated PDF shortlist.', '/Users/qianli/Downloads/2BD_2BA_Apartment_Recommendations_Near_Palo_Alto.pdf'],
    [new Date(2026, 2, 17, 17, 35), 'SEED_SOURCE_LOADED', 'Seed Sources', 'Sofi Sunnyvale', '', 'Loaded from curated PDF shortlist.', '/Users/qianli/Downloads/2BD_2BA_Apartment_Recommendations_Near_Palo_Alto.pdf'],
    [new Date(2026, 2, 17, 17, 36), 'QUEUE_CREATED', 'Search Queue', 'Palo Alto Place', '', 'Created P1 verification task.', 'https://www.paloaltoplace.com/floorplans'],
    [new Date(2026, 2, 17, 17, 36), 'QUEUE_CREATED', 'Search Queue', 'Sevens', '', 'Created P1 verification task.', 'https://sevensmv.com/floorplans/b2/'],
    [new Date(2026, 2, 17, 17, 36), 'QUEUE_CREATED', 'Search Queue', 'Landsby', '', 'Created P1 verification task.', 'https://livelandsby.com/floorplans/2a-1/'],
    [new Date(2026, 2, 17, 17, 36), 'QUEUE_CREATED', 'Search Queue', 'Sofi Sunnyvale', '', 'Created P1 verification task.', 'https://www.sofisunnyvale.com/apartments/ca/sunnyvale/floor-plans'],
  ];

  overwriteBody_(SHEET_NAMES.controls, controls);
  overwriteBody_(SHEET_NAMES.seedSources, seedSources);
  overwriteBody_(SHEET_NAMES.searchQueue, queueRows);
  overwriteBody_(SHEET_NAMES.intake, intakeRows);
  overwriteBody_(SHEET_NAMES.auditLog, auditRows);

  const candidateSheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.candidates);
  clearSheetBody_(candidateSheet);
  upsertFromIntake();
  refreshDerivedFields();
}

function overwriteBody_(sheetName, rows) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  clearSheetBody_(sheet);
  if (!rows.length) return;
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function clearSheetBody_(sheet) {
  const maxRows = sheet.getMaxRows();
  const maxCols = sheet.getMaxColumns();
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, maxCols).clearContent();
  }
}
