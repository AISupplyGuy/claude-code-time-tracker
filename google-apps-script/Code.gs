// ============================================
// TIME TRACKER — Google Apps Script
// Paste this into script.google.com
// Deploy as Web App (Execute as: Me, Access: Anyone)
// Then run: bash ~/.timetrack/timetrack.sh set-url <YOUR_WEBAPP_URL>
// ============================================

// Set this to your Google Doc ID (from the URL), or leave blank to auto-create
const DOC_ID = '';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sessions = data.sessions || [];

    const doc = DOC_ID
      ? DocumentApp.openById(DOC_ID)
      : getOrCreateDoc();

    const body = doc.getBody();
    body.clear();

    // Title
    const title = body.appendParagraph('Time Tracking Report');
    title.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    title.setForegroundColor('#1a1a1a');

    const updated = body.appendParagraph('Last synced: ' + new Date().toLocaleString());
    updated.setForegroundColor('#666666');
    updated.setFontSize(10);
    body.appendParagraph('');

    // Filter to completed sessions only
    const completed = sessions.filter(s => s.stop);

    if (completed.length === 0) {
      body.appendParagraph('No completed sessions yet.');
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        docUrl: doc.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Organize by group -> project -> sessions
    const groups = {};

    completed.forEach(s => {
      const group = s.group || 'Ungrouped';
      const project = s.project || 'Unknown';

      if (!groups[group]) groups[group] = {};
      if (!groups[group][project]) groups[group][project] = [];

      const start = new Date(s.start);
      const stop = new Date(s.stop);
      const hours = (stop - start) / 3600000;

      groups[group][project].push({
        date: start.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        start: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        stop: stop.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        hours: hours,
        autoStopped: s.auto_stopped || false
      });
    });

    let grandTotal = 0;

    // Render each group
    const groupNames = Object.keys(groups).sort();

    groupNames.forEach(groupName => {
      const groupData = groups[groupName];
      let groupTotal = 0;

      Object.values(groupData).forEach(sessions => {
        sessions.forEach(s => groupTotal += s.hours);
      });
      grandTotal += groupTotal;

      // Group header
      const groupHeader = body.appendParagraph(groupName + ' — ' + groupTotal.toFixed(2) + ' hours');
      groupHeader.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      groupHeader.setForegroundColor('#2d2d2d');

      // Each project in the group
      const projectNames = Object.keys(groupData).sort();

      projectNames.forEach(projectName => {
        const projectSessions = groupData[projectName];
        const projectTotal = projectSessions.reduce((sum, s) => sum + s.hours, 0);

        // Project header
        const projHeader = body.appendParagraph(projectName + ': ' + projectTotal.toFixed(2) + ' hours (' + projectSessions.length + ' sessions)');
        projHeader.setHeading(DocumentApp.ParagraphHeading.HEADING3);
        projHeader.setForegroundColor('#444444');

        // Build table
        const table = body.appendTable();

        // Header row
        const headerRow = table.appendTableRow();
        ['Date', 'Start', 'Stop', 'Hours', 'Notes'].forEach(h => {
          const cell = headerRow.appendTableCell(h);
          cell.setBackgroundColor('#f0f0f0');
          cell.getChild(0).asParagraph().setBold(true);
        });

        // Session rows
        projectSessions.forEach(s => {
          const row = table.appendTableRow();
          row.appendTableCell(s.date);
          row.appendTableCell(s.start);
          row.appendTableCell(s.stop);
          row.appendTableCell(s.hours.toFixed(2));
          row.appendTableCell(s.autoStopped ? 'auto-stopped' : '');
        });

        // Total row
        const totalRow = table.appendTableRow();
        const totalLabel = totalRow.appendTableCell('TOTAL');
        totalLabel.getChild(0).asParagraph().setBold(true);
        totalRow.appendTableCell('');
        totalRow.appendTableCell('');
        const totalHours = totalRow.appendTableCell(projectTotal.toFixed(2));
        totalHours.getChild(0).asParagraph().setBold(true);
        totalRow.appendTableCell('');

        body.appendParagraph('');
      });
    });

    // Grand total at bottom
    if (groupNames.length > 1 || Object.keys(groups[groupNames[0]] || {}).length > 1) {
      body.appendParagraph('');
      const grandTotalPara = body.appendParagraph('GRAND TOTAL: ' + grandTotal.toFixed(2) + ' hours');
      grandTotalPara.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      grandTotalPara.setBold(true);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      docUrl: doc.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateDoc() {
  const files = DriveApp.getFilesByName('Claude Code Time Tracking');
  if (files.hasNext()) {
    return DocumentApp.openById(files.next().getId());
  }
  return DocumentApp.create('Claude Code Time Tracking');
}

// Test function — run this manually inside Apps Script to verify it works.
// Replace these placeholder sessions with anything; they get written to your doc.
function testDoPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        sessions: [
          {
            project: 'Example Project A',
            group: 'Example Client',
            start: '2026-01-01T09:00:00Z',
            stop: '2026-01-01T11:30:00Z',
            auto_stopped: false
          },
          {
            project: 'Example Project B',
            group: 'Example Client',
            start: '2026-01-02T13:00:00Z',
            stop: '2026-01-02T14:15:00Z',
            auto_stopped: true
          }
        ]
      })
    }
  };

  const result = doPost(testData);
  Logger.log(result.getContent());
}
