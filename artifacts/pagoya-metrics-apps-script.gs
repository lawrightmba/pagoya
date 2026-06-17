/**
 * PagoYa — Investor Metrics Auto-Updater
 * =========================================
 * Setup:
 *   1. Open a new Google Sheet
 *   2. Extensions → Apps Script → paste this entire file
 *   3. Fill in API_BASE_URL and ADMIN_TOKEN below
 *   4. Run syncMetrics() once manually to test
 *   5. Set a trigger: Triggers (⏰) → Add Trigger → syncMetrics → Time-driven → Every 30 minutes
 *
 * The script writes live data to two sheets:
 *   "Live Metrics"   — key/value table investors can see at a glance
 *   "Weekly Signups" — weekly registration history for charting
 */

var API_BASE_URL = "https://86cae774-c82e-441c-9e1e-162b1f174041-00-16bhsci0d8wkm.riker.replit.dev";
// ⚠️  Replace with your production URL after deploying, e.g.:
// var API_BASE_URL = "https://pagoyamx.replit.app";

var ADMIN_TOKEN = "PASTE_YOUR_ADMIN_TOKEN_HERE";
// The same token you use to access the /admin page in the PagoYa app.

// ─── Main entry point ─────────────────────────────────────────────────────────
function syncMetrics() {
  var url = API_BASE_URL + "/api/admin/investor-stats?adminKey=" + encodeURIComponent(ADMIN_TOKEN);

  var response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { "Accept": "application/json" },
  });

  if (response.getResponseCode() !== 200) {
    Logger.log("Error fetching metrics: " + response.getContentText());
    return;
  }

  var d = JSON.parse(response.getContentText());
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  writeLiveMetrics(ss, d);
  writeWeeklySignups(ss, d);

  Logger.log("PagoYa metrics synced at " + new Date().toISOString());
}

// ─── Live Metrics sheet ───────────────────────────────────────────────────────
function writeLiveMetrics(ss, d) {
  var sheet = ss.getSheetByName("Live Metrics") || ss.insertSheet("Live Metrics");
  sheet.clearContents();

  var now = new Date(d.as_of).toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

  var rows = [
    // Title row
    ["PagoYa — Live Investor Metrics", "", ""],
    ["Last updated: " + now + " MX", "", ""],
    ["", "", ""],

    // Headers
    ["METRIC", "VALUE", "NOTES"],

    // ── Users ──
    ["── USERS ──", "", ""],
    ["Total Registered Users",     d.users.total,                   "Excludes test accounts"],
    ["New Users (Last 7 Days)",    d.users.new_7d,                  ""],
    ["New Users (Last 30 Days)",   d.users.new_30d,                 ""],
    ["Users via WhatsApp (Paula)", d.users.by_source.whatsapp_organic, "signup_source = whatsapp_organic"],
    ["Users via Web Organic",      d.users.by_source.web_organic,   ""],
    ["Users via Rep Network",      d.users.by_source.rep_referral,  ""],
    ["Users with KYC Name",        d.users.with_name,               "Completed registration flow"],
    ["", "", ""],

    // ── Payments ──
    ["── PAYMENTS ──", "", ""],
    ["Total Completed Payments",   d.payments.completed,            "confirmed / completed / success"],
    ["Total Payment Volume (MXN)", d.payments.volume_total,         "Sum of bill amounts paid"],
    ["Total Platform Revenue (MXN)",d.payments.revenue_total,       "$25 MXN fee per transaction"],
    ["", "", ""],
    ["Payments — Last 7 Days",     d.payments.last_7d.count,        ""],
    ["Volume — Last 7 Days (MXN)", d.payments.last_7d.volume,       ""],
    ["Revenue — Last 7 Days (MXN)",d.payments.last_7d.revenue,      ""],
    ["", "", ""],
    ["Payments — Last 30 Days",    d.payments.last_30d.count,       ""],
    ["Volume — Last 30 Days (MXN)",d.payments.last_30d.volume,      ""],
    ["Revenue — Last 30 Days (MXN)",d.payments.last_30d.revenue,    ""],
    ["", "", ""],

    // ── Wallets ──
    ["── WALLETS ──", "", ""],
    ["Active Wallets",             d.wallets.count,                  ""],
    ["Total Balance in Circulation (MXN)", d.wallets.balance_total,  "Funds held across all user wallets"],
    ["", "", ""],

    // ── Score ──
    ["── CREDIT SCORE ──", "", ""],
    ["Average PTI Score",          d.pti.avg_score > 0 ? d.pti.avg_score.toFixed(1) : "—", "PagoYa Trust Index (0–100)"],
  ];

  // Write top billers if any
  if (d.top_billers && d.top_billers.length > 0) {
    rows.push(["", "", ""]);
    rows.push(["── TOP BILLERS ──", "", ""]);
    rows.push(["Service", "Transactions", "Volume (MXN)"]);
    d.top_billers.forEach(function(b) {
      rows.push([b.service, b.count, b.volume]);
    });
  }

  sheet.getRange(1, 1, rows.length, 3).setValues(rows);

  // Formatting
  var headerRow = sheet.getRange(1, 1, 1, 3);
  headerRow.setFontSize(14).setFontWeight("bold").setBackground("#0A2540").setFontColor("#39A935");

  var colA = sheet.getRange(1, 1, rows.length, 1);
  colA.setFontWeight("bold");

  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 300);

  // Section headers in dark green
  rows.forEach(function(row, i) {
    if (typeof row[0] === "string" && row[0].startsWith("──")) {
      sheet.getRange(i + 1, 1, 1, 3).setBackground("#f0f7f0").setFontWeight("bold");
    }
  });
}

// ─── Weekly Signups sheet ─────────────────────────────────────────────────────
function writeWeeklySignups(ss, d) {
  var sheet = ss.getSheetByName("Weekly Signups") || ss.insertSheet("Weekly Signups");
  sheet.clearContents();

  var rows = [["Week Start", "New Signups"]];
  if (d.growth && d.growth.weekly_signups) {
    d.growth.weekly_signups.forEach(function(w) {
      rows.push([w.week, w.signups]);
    });
  }

  sheet.getRange(1, 1, rows.length, 2).setValues(rows);

  // Bold header
  sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#0A2540").setFontColor("#39A935");
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 140);

  // Auto-insert chart if there's data
  if (rows.length > 2) {
    var existingCharts = sheet.getCharts();
    existingCharts.forEach(function(c) { sheet.removeChart(c); });

    var chart = sheet.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(sheet.getRange(1, 1, rows.length, 2))
      .setPosition(1, 4, 0, 0)
      .setOption("title", "PagoYa — Weekly New Signups")
      .setOption("width", 480)
      .setOption("height", 280)
      .build();
    sheet.insertChart(chart);
  }
}
