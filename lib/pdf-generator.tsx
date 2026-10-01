import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import { Certificate } from '@prisma/client'
import { getCertificateData } from '@/lib/certificate-data'

// Register fonts
Font.register({
  family: 'Oswald',
  src: 'https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf'
})

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2563eb'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40
  },
  recipient: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40
  },
  course: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40
  },
  date: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40
  },
  certificateId: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20
  },
  signature: {
    marginTop: 60,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    width: '50%',
    textAlign: 'center'
  }
})

// Create Document Component
const CertificateDocument = ({ certificate }: { certificate: Certificate }) => {
  const data = getCertificateData(certificate)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.header}>CERTIFICATE OF COMPLETION</Text>
          <Text style={styles.subtitle}>This certificate is proudly presented to</Text>
          <Text style={styles.recipient}>{data.userName || 'Recipient'}</Text>
          <Text style={styles.subtitle}>for successfully completing</Text>
          <Text style={styles.course}>{data.courseTitle || 'Course Title'}</Text>
          <Text style={styles.date}>Completed on {new Date(certificate.completionDate).toLocaleDateString()}</Text>
          <Text style={styles.certificateId}>Certificate ID: {certificate.certificateNumber}</Text>
          <View style={styles.signature}>
            <Text>Authorized Signature</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default CertificateDocument