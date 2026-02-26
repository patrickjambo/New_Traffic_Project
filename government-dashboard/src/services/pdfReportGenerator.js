import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, startOfYear, endOfYear } from 'date-fns';

/**
 * PDF Report Generator for RNP Traffic Command
 * Generates professional PDF reports with RNP branding
 */

const RNP_LOGO_PATH = '/assets/rnp-logo.png';
const INSTITUTION_NAME = 'Rwanda National Police';
const DEPARTMENT_NAME = 'Traffic Command';
const REPORT_TITLE = 'National Traffic Management & Incident Control';

/**
 * Generate a professional PDF report header with RNP branding
 */
export const addReportHeader = (doc, title, subtitle = '') => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add background color
  doc.setFillColor(15, 23, 42); // Dark blue background
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  // Add RNP Logo (if available)
  try {
    doc.addImage(RNP_LOGO_PATH, 'PNG', 15, 8, 20, 20);
  } catch (e) {
    console.log('Logo not available, continuing without it');
  }
  
  // Institution Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(INSTITUTION_NAME, pageWidth / 2, 15, { align: 'center' });
  
  // Department Name
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(DEPARTMENT_NAME, pageWidth / 2, 22, { align: 'center' });
  
  // Report Title
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(REPORT_TITLE, pageWidth / 2, 29, { align: 'center' });
  
  // Report Type Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(title, pageWidth / 2, 42, { align: 'center' });
  
  // Subtitle if provided
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(subtitle, pageWidth / 2, 50, { align: 'center' });
  }
  
  // Add horizontal line
  doc.setDrawColor(100, 150, 255);
  doc.setLineWidth(0.5);
  doc.line(15, 55, pageWidth - 15, 55);
  
  return 60; // Return Y position after header
};

/**
 * Add footer with page number and date
 */
export const addReportFooter = (doc, pageNumber) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Footer background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  
  // Footer text
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  // Left: Generated date
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 15, pageHeight - 5);
  
  // Center: Institution
  doc.text(INSTITUTION_NAME, pageWidth / 2, pageHeight - 5, { align: 'center' });
  
  // Right: Page number
  doc.text(`Page ${pageNumber}`, pageWidth - 15, pageHeight - 5, { align: 'right' });
};

/**
 * Generate Emergency Report PDF
 */
export const generateEmergencyReportPDF = (emergency, incidents) => {
  const doc = new jsPDF();
  let yPosition = addReportHeader(doc, 'Emergency Report', `Report ID: ${emergency.id}`);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // Emergency Details Section
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Emergency Details', margin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const emergencyDetails = [
    ['Emergency Type:', emergency.emergency_type || 'N/A'],
    ['Severity Level:', (emergency.severity || 'N/A').toUpperCase()],
    ['Location:', emergency.location_name || 'N/A'],
    ['Coordinates:', `${emergency.latitude?.toFixed(4)}, ${emergency.longitude?.toFixed(4)}`],
    ['Date & Time:', format(new Date(emergency.created_at), 'MMM dd, yyyy HH:mm:ss')],
    ['Status:', (emergency.status || 'N/A').toUpperCase()],
    ['Source:', emergency.automatic ? 'AI Detection' : 'Manual Report'],
    ['Description:', emergency.description || 'N/A']
  ];
  
  emergencyDetails.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, margin, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), margin + 50, yPosition);
    yPosition += 6;
  });
  
  // Related Incidents Section
  if (incidents && incidents.length > 0) {
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Related Incidents', margin, yPosition);
    
    yPosition += 8;
    
    const incidentData = incidents.slice(0, 5).map(incident => [
      incident.type || 'N/A',
      incident.location || 'N/A',
      format(new Date(incident.created_at), 'MMM dd, HH:mm'),
      (incident.severity || 'N/A').toUpperCase(),
      incident.status || 'N/A'
    ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Type', 'Location', 'Date/Time', 'Severity', 'Status']],
      body: incidentData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
  }
  
  // Add footer
  addReportFooter(doc, 1);
  
  return doc;
};

/**
 * Generate Monthly Report PDF
 */
export const generateMonthlyReportPDF = (incidents, emergencies, month = new Date()) => {
  const doc = new jsPDF();
  const monthName = format(month, 'MMMM yyyy');
  let yPosition = addReportHeader(doc, 'Monthly Traffic Report', monthName);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  
  // Summary Statistics
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Summary Statistics', margin, yPosition);
  
  yPosition += 8;
  
  const totalIncidents = incidents.length;
  const totalEmergencies = emergencies.length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
  const aiDetected = incidents.filter(i => i.source === 'ai').length;
  
  const statsData = [
    ['Total Incidents', totalIncidents],
    ['Total Emergencies', totalEmergencies],
    ['Critical/High Severity', criticalIncidents],
    ['Resolved Incidents', resolvedIncidents],
    ['AI Detected', aiDetected],
    ['Manual Reports', totalIncidents - aiDetected]
  ];
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  statsData.forEach(([label, value], index) => {
    const xPos = index % 2 === 0 ? margin : pageWidth / 2;
    const yPos = yPosition + Math.floor(index / 2) * 8;
    
    doc.setFont(undefined, 'bold');
    doc.text(label + ':', xPos, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), xPos + 60, yPos);
  });
  
  yPosition += 30;
  
  // Incidents by Type
  if (incidents.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Type', margin, yPosition);
    
    yPosition += 8;
    
    const incidentsByType = {};
    incidents.forEach(incident => {
      const type = incident.type || 'Unknown';
      incidentsByType[type] = (incidentsByType[type] || 0) + 1;
    });
    
    const typeData = Object.entries(incidentsByType).map(([type, count]) => [
      type,
      count,
      ((count / totalIncidents) * 100).toFixed(1) + '%'
    ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Incident Type', 'Count', 'Percentage']],
      body: typeData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
  }
  
  // Incidents by Severity
  if (incidents.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Severity', margin, yPosition);
    
    yPosition += 8;
    
    const incidentsBySeverity = {};
    incidents.forEach(incident => {
      const severity = incident.severity || 'Unknown';
      incidentsBySeverity[severity] = (incidentsBySeverity[severity] || 0) + 1;
    });
    
    const severityData = Object.entries(incidentsBySeverity).map(([severity, count]) => [
      severity.toUpperCase(),
      count,
      ((count / totalIncidents) * 100).toFixed(1) + '%'
    ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Severity Level', 'Count', 'Percentage']],
      body: severityData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
  }
  
  // Add footer
  addReportFooter(doc, 1);
  
  return doc;
};

/**
 * Generate Annual Report PDF
 */
export const generateAnnualReportPDF = (incidents, emergencies, year = new Date().getFullYear()) => {
  const doc = new jsPDF();
  let pageNumber = 1;
  
  // Title Page
  let yPosition = addReportHeader(doc, 'Annual Traffic Report', `Year ${year}`);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  yPosition += 20;
  
  // Executive Summary
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Executive Summary', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  const totalIncidents = incidents.length;
  const totalEmergencies = emergencies.length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
  const resolutionRate = totalIncidents > 0 ? ((resolvedIncidents / totalIncidents) * 100).toFixed(1) : 0;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const summaryText = `
This annual report provides a comprehensive overview of traffic management and incident control operations for the year ${year}. 
The report details all incidents, emergencies, and traffic management activities handled by the Rwanda National Police Traffic Command.

Key Highlights:
• Total Incidents Reported: ${totalIncidents}
• Total Emergencies: ${totalEmergencies}
• Critical/High Severity Incidents: ${criticalIncidents}
• Resolved Incidents: ${resolvedIncidents}
• Resolution Rate: ${resolutionRate}%
• Average Response Time: Optimized through real-time tracking
  `;
  
  doc.setFont(undefined, 'normal');
  const splitText = doc.splitTextToSize(summaryText, pageWidth - 2 * margin);
  doc.text(splitText, margin, yPosition);
  
  yPosition += splitText.length * 5 + 20;
  
  // Add page break if needed
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    pageNumber++;
    yPosition = 20;
  }
  
  // Annual Statistics
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(50, 150, 255);
  doc.text('Annual Statistics', margin, yPosition);
  
  yPosition += 10;
  
  const statsData = [
    ['Total Incidents', totalIncidents],
    ['Total Emergencies', totalEmergencies],
    ['Critical/High Severity', criticalIncidents],
    ['Resolved Incidents', resolvedIncidents],
    ['Resolution Rate', resolutionRate + '%'],
    ['AI Detected Incidents', incidents.filter(i => i.source === 'ai').length],
    ['Manual Reports', incidents.filter(i => i.source !== 'ai').length]
  ];
  
  doc.autoTable({
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: statsData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [50, 150, 255],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [0, 0, 0]
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    }
  });
  
  yPosition = doc.lastAutoTable.finalY + 15;
  
  // Incidents by Type
  if (incidents.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      pageNumber++;
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Type', margin, yPosition);
    
    yPosition += 10;
    
    const incidentsByType = {};
    incidents.forEach(incident => {
      const type = incident.type || 'Unknown';
      incidentsByType[type] = (incidentsByType[type] || 0) + 1;
    });
    
    const typeData = Object.entries(incidentsByType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => [
        type,
        count,
        ((count / totalIncidents) * 100).toFixed(1) + '%'
      ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Incident Type', 'Count', 'Percentage']],
      body: typeData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
  }
  
  // Incidents by Severity
  if (incidents.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      pageNumber++;
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Severity', margin, yPosition);
    
    yPosition += 10;
    
    const incidentsBySeverity = {};
    incidents.forEach(incident => {
      const severity = incident.severity || 'Unknown';
      incidentsBySeverity[severity] = (incidentsBySeverity[severity] || 0) + 1;
    });
    
    const severityData = Object.entries(incidentsBySeverity)
      .sort((a, b) => b[1] - a[1])
      .map(([severity, count]) => [
        severity.toUpperCase(),
        count,
        ((count / totalIncidents) * 100).toFixed(1) + '%'
      ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Severity Level', 'Count', 'Percentage']],
      body: severityData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
  }
  
  // Incidents by Status
  if (incidents.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      pageNumber++;
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50, 150, 255);
    doc.text('Incidents by Status', margin, yPosition);
    
    yPosition += 10;
    
    const incidentsByStatus = {};
    incidents.forEach(incident => {
      const status = incident.status || 'Unknown';
      incidentsByStatus[status] = (incidentsByStatus[status] || 0) + 1;
    });
    
    const statusData = Object.entries(incidentsByStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => [
        status.toUpperCase(),
        count,
        ((count / totalIncidents) * 100).toFixed(1) + '%'
      ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Status', 'Count', 'Percentage']],
      body: statusData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [50, 150, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
  }
  
  // Add footer to all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addReportFooter(doc, i);
  }
  
  return doc;
};

/**
 * Download PDF file
 */
export const downloadPDF = (doc, filename) => {
  doc.save(filename);
};
