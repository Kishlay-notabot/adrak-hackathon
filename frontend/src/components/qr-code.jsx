// frontend/src/components/qr-code.jsx
import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"

/**
 * Renders a real, scannable QR code on a canvas.
 * Install: npm install qrcode
 */
export function QRCodeCanvas({ value, size = 200, className = "" }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return

    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    }).catch(console.error)
  }, [value, size])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  )
}

/**
 * Returns a QR code as a data URL string (for downloads/printing).
 */
export function useQRCodeDataURL(value) {
  const [dataUrl, setDataUrl] = useState("")

  useEffect(() => {
    if (!value) return
    QRCode.toDataURL(value, {
      width: 400,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then(setDataUrl)
      .catch(console.error)
  }, [value])

  return dataUrl
}

/**
 * Downloads the QR code as a PNG.
 */
export function downloadQR(canvasOrDataUrl, filename = "qr-code.png") {
  const link = document.createElement("a")
  link.download = filename

  if (typeof canvasOrDataUrl === "string") {
    link.href = canvasOrDataUrl
  } else if (canvasOrDataUrl?.toDataURL) {
    link.href = canvasOrDataUrl.toDataURL("image/png")
  } else {
    return
  }

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Opens a print dialog with just the QR code.
 */
export function printQR(canvasOrDataUrl, patientName = "", pid = "") {
  let imgSrc
  if (typeof canvasOrDataUrl === "string") {
    imgSrc = canvasOrDataUrl
  } else if (canvasOrDataUrl?.toDataURL) {
    imgSrc = canvasOrDataUrl.toDataURL("image/png")
  } else {
    return
  }

  const win = window.open("", "_blank")
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>QR Code - ${pid}</title></head>
    <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
      <img src="${imgSrc}" style="width:300px;height:300px;" />
      <p style="font-size:18px;font-weight:bold;margin-top:16px;">${patientName}</p>
      <p style="font-size:14px;color:#666;">${pid}</p>
      <script>window.onload=()=>{window.print();window.close();}<\/script>
    </body>
    </html>
  `)
  win.document.close()
}
