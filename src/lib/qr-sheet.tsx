import 'server-only'

import { Document, Font, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import path from 'node:path'
import QRCode from 'qrcode'

/**
 * Printable QR codes for museum staff (`/api/qr-sheet`), drawn with react-pdf.
 *
 * - One code: an A5 page to frame or pin next to the piece (tour, object,
 *   content), with the title, the museum and how to use it.
 * - A museum: an A4 sheet of labels, one per object on its map, to cut out or
 *   print on adhesive paper.
 *
 * Printing rules (DESIGN.md → The Museum Primary Rule, QR codes): black on
 * white, never the museum color (cameras read contrast); error correction Q
 * (scratches, glare); a quiet zone of 4 modules; at least ~3 cm per side.
 * Each code is one vector path from `qrcode`, so it stays sharp at any size.
 */

// Noto Sans covers Latin Extended, Greek and Cyrillic: every app language.
// The PDF's built-in Helvetica would garble Polish, Greek or Bulgarian.
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')
Font.register({
  family: 'Noto Sans',
  fonts: [
    { src: path.join(FONT_DIR, 'NotoSans-Regular.ttf') },
    { src: path.join(FONT_DIR, 'NotoSans-Bold.ttf'), fontWeight: 'bold' },
  ],
})
// Titles in 24 languages wrap on spaces only; no English hyphenation rules.
Font.registerHyphenationCallback((word) => [word])

export type QrSheetCode = { url: string; title: string }

/** Printed codes: error correction Q (scratches, glare), a 4-module quiet zone. */
export const PRINT_QR_OPTIONS = { errorCorrectionLevel: 'Q', margin: 4 } as const

/** The code as one SVG path (`qrcode`'s own output) and its viewBox. */
async function qrPath(url: string) {
  const svg = await QRCode.toString(url, { ...PRINT_QR_OPTIONS, type: 'svg' })
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1]
  const d = /<path stroke="#000000" d="([^"]+)"/.exec(svg)?.[1]
  if (!viewBox || !d) throw new Error('Unexpected qrcode SVG output')
  return { viewBox, d }
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Noto Sans', padding: 36, color: '#111111' },
  single: { alignItems: 'center', justifyContent: 'center', gap: 14, flexGrow: 1 },
  museum: { fontSize: 11, color: '#555555', textAlign: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  hint: { fontSize: 11, textAlign: 'center' },
  footer: { fontSize: 8, color: '#777777', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  label: {
    width: '48%',
    height: 180,
    borderWidth: 0.5,
    borderColor: '#bbbbbb',
    borderStyle: 'dashed',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  labelText: { flexShrink: 1, gap: 6 },
  labelTitle: { fontSize: 12, fontWeight: 'bold' },
  labelHint: { fontSize: 8, color: '#555555' },
})

function Code({ viewBox, d, size }: { viewBox: string; d: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox={viewBox}>
      <Path d={d} stroke="#000000" />
    </Svg>
  )
}

export async function singleSheet({
  code,
  museum,
  hint,
}: {
  code: QrSheetCode
  museum: string
  hint: string
}) {
  const qr = await qrPath(code.url)
  return (
    <Document title={code.title} author={museum} creator="ArtAround">
      <Page size="A5" style={styles.page}>
        <View style={styles.single}>
          <Text style={styles.museum}>{museum}</Text>
          {/* 9 cm: readable from an arm's length, well above the minimum. */}
          <Code {...qr} size={255} />
          <Text style={styles.title}>{code.title}</Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>
        <Text style={styles.footer}>ArtAround</Text>
      </Page>
    </Document>
  )
}

export async function labelSheet({
  codes,
  museum,
  hint,
}: {
  codes: QrSheetCode[]
  museum: string
  hint: string
}) {
  const qrs = await Promise.all(codes.map((code) => qrPath(code.url)))
  return (
    <Document title={museum} author={museum} creator="ArtAround">
      {/* react-pdf breaks the wrapped grid across pages by itself. */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.museum, { marginBottom: 12 }]} fixed>
          {museum}
        </Text>
        <View style={styles.grid}>
          {codes.map((code, index) => (
            <View key={code.url} style={styles.label} wrap={false}>
              {/* 4.4 cm codes: comfortably above the 3 cm minimum. */}
              <Code {...qrs[index]} size={125} />
              <View style={styles.labelText}>
                <Text style={styles.labelTitle}>{code.title}</Text>
                <Text style={styles.labelHint}>{hint}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
