'use client'

import React from 'react'
import { type ScriptKitRelease, type BetaRelease } from '@/lib/get-scriptkit-releases'
import cx from 'classnames'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

type Props = {
  macIntelRelease: ScriptKitRelease | null
  macSiliconRelease: ScriptKitRelease | null
  windowsx64Release: ScriptKitRelease | null
  windowsarm64Release: ScriptKitRelease | null
  linuxx64Release: ScriptKitRelease | null
  linuxarm64Release: ScriptKitRelease | null
  betaRelease: BetaRelease | null
}

export default function ScriptKitDownload({
  macIntelRelease,
  macSiliconRelease,
  windowsx64Release,
  windowsarm64Release,
  linuxx64Release,
  linuxarm64Release,
  betaRelease,
}: Props) {
  const macReleases = [
    macIntelRelease && { ...macIntelRelease, label: 'Intel' },
    macSiliconRelease && { ...macSiliconRelease, label: 'Apple Silicon' },
  ].filter(Boolean) as (ScriptKitRelease & { label: string })[]
  const [systemInfo, setSystemInfo] = React.useState({
    isOnMacMachine: false,
    isOnWindowsMachine: false,
    isOnLinuxMachine: false,
  })

  React.useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    setSystemInfo({
      isOnMacMachine: userAgent.includes('mac'),
      isOnWindowsMachine: userAgent.includes('win'),
      isOnLinuxMachine: userAgent.includes('linux'),
    })
  }, [])
  const [isDownloadsDialogOpen, setIsDownloadsDialogOpen] = React.useState(false)
  return (
    <div className="w-full flex z-10 border-y flex-col sm:py-24 py-10 items-center justify-center gap-5 max-w-2xl bg-background relative">
      <h2 className="lg:text-4xl sm:text-3xl text-2xl font-semibold mb-5 text-center">
        Download Script Kit
      </h2>
      <div className="flex sm:flex-row flex-col items-center gap-8">
        <MacReleases
          className={cx({ hidden: !systemInfo.isOnMacMachine })}
          macReleases={macReleases}
        />
        <WindowsReleases
          className={cx({ hidden: !systemInfo.isOnWindowsMachine })}
          windowsx64Release={windowsx64Release}
          windowsarm64Release={windowsarm64Release}
        />
        <LinuxReleases
          className={cx({ hidden: !systemInfo.isOnLinuxMachine })}
          linuxx64Release={linuxx64Release}
          linuxarm64Release={linuxarm64Release}
        />
        {betaRelease?.html_url && (
          <DownloadButton variant="outline" icon={<BeakerIcon />} href={betaRelease?.html_url}>
            Beta
          </DownloadButton>
        )}
      </div>
      {true && (
        <p className="text-sm mt-5 text-gray-500">
          {windowsx64Release || windowsarm64Release ? 'Windows' : ''}
          {(windowsx64Release || windowsarm64Release) && (linuxx64Release || linuxarm64Release)
            ? ' and '
            : ''}
          {linuxx64Release || linuxarm64Release ? 'Linux' : ''} versions available{' '}
          <Button
            type="button"
            size="icon"
            variant="link"
            className="text-white"
            onClick={() => {
              setIsDownloadsDialogOpen(true)
            }}
          >
            here
          </Button>
        </p>
      )}
      {/* <div className="absolute inset-0 pointer-events-none w-full h-full bg-gradient-to-r from-transparent via-background to-transparent z-10" /> */}
      <Dialog modal={true} open={isDownloadsDialogOpen} onOpenChange={setIsDownloadsDialogOpen}>
        <DialogContent className="z-50">
          <DialogHeader>
            <DialogTitle>Download Script Kit</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-col divide-y divide-border py-5 text-white items-start">
                <MacReleases className="py-4 w-full" macReleases={macReleases} />
                <WindowsReleases
                  className="py-4 w-full"
                  windowsx64Release={windowsx64Release}
                  windowsarm64Release={windowsarm64Release}
                />
                <LinuxReleases
                  className="py-4 w-full"
                  linuxx64Release={linuxx64Release}
                  linuxarm64Release={linuxarm64Release}
                />
                {betaRelease?.html_url && (
                  <div className="py-4 w-full">
                    <DownloadButton
                      variant="outline"
                      icon={<BeakerIcon />}
                      href={betaRelease?.html_url}
                    >
                      Beta
                    </DownloadButton>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const MacReleases = ({
  macReleases,
  className,
}: {
  macReleases: (ScriptKitRelease & { name?: string; label: string })[]
  className?: string
}) => {
  return (
    <div className={cn('flex sm:items-center sm:gap-2 gap-4 sm:flex-row flex-col', className)}>
      <div className="flex justify-center sm:justify-start items-center gap-2 mr-3">
        <AppleIcon /> MacOs
      </div>
      {macReleases.map((release, i) => {
        if (!release?.browser_download_url) return null
        return (
          <DownloadButton
            key={release.label}
            icon={<AppleIcon />}
            href={release?.browser_download_url}
          >
            {release.label}
          </DownloadButton>
        )
      })}
    </div>
  )
}

const WindowsReleases = ({
  windowsx64Release,
  windowsarm64Release,
  className,
}: {
  windowsx64Release: ScriptKitRelease | null
  windowsarm64Release: ScriptKitRelease | null
  className?: string
}) => {
  return (
    <div className={cn('flex sm:items-center sm:gap-2 gap-4 sm:flex-row flex-col', className)}>
      <div className="flex justify-center sm:justify-start items-center gap-2 mr-3">
        <WindowsIcon /> Windows
      </div>
      {windowsx64Release?.browser_download_url && (
        <DownloadButton icon={<WindowsIcon />} href={windowsx64Release?.browser_download_url}>
          x64
        </DownloadButton>
      )}
      {windowsarm64Release?.browser_download_url && (
        <DownloadButton icon={<WindowsIcon />} href={windowsarm64Release?.browser_download_url}>
          arm64
        </DownloadButton>
      )}
    </div>
  )
}

const LinuxReleases = ({
  linuxx64Release,
  linuxarm64Release,
  className,
}: {
  linuxx64Release: ScriptKitRelease | null
  linuxarm64Release: ScriptKitRelease | null
  className?: string
}) => {
  return (
    <div className={cn('flex sm:items-center sm:gap-2 gap-4 sm:flex-row flex-col', className)}>
      <div className="flex justify-center sm:justify-start items-center gap-2 mr-3">
        <LinuxIcon /> Linux
      </div>
      {linuxx64Release?.browser_download_url && (
        <DownloadButton icon={<LinuxIcon />} href={linuxx64Release?.browser_download_url}>
          x64
        </DownloadButton>
      )}

      {linuxarm64Release?.browser_download_url && (
        <DownloadButton icon={<LinuxIcon />} href={linuxarm64Release?.browser_download_url}>
          arm64
        </DownloadButton>
      )}
    </div>
  )
}

const DownloadButton = ({
  icon,
  href,
  children,
  variant = 'default',
}: {
  icon: React.ReactNode
  href: string
  children: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | null
}) => {
  return (
    <Button asChild variant={variant}>
      <a href={href}>
        {icon}
        <span className="pl-1">{children}</span>
      </a>
    </Button>
  )
}

const AppleIcon = () => (
  <svg className="w-5 pb-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <title>apple</title>
    <g fill="currentColor">
      <path
        fill="currentColor"
        d="M14.326,12.08c-0.346,0.766-0.511,1.108-0.957,1.785c-0.621,0.945-1.496,2.123-2.581,2.133 c-0.964,0.009-1.212-0.627-2.52-0.62S6.686,16.009,5.722,16c-1.085-0.01-1.914-1.073-2.536-2.019 C1.45,11.337,1.268,8.235,2.339,6.586c0.761-1.173,1.962-1.858,3.092-1.858c1.15,0,1.872,0.63,2.823,0.63 c0.922,0,1.484-0.631,2.814-0.631c1.005,0,2.07,0.547,2.828,1.492C11.411,7.582,11.815,11.131,14.326,12.08L14.326,12.08z"
      />
      <path d="M10.604,2.699c0.546-0.7,0.96-1.689,0.809-2.699C10.522,0.061,9.48,0.628,8.871,1.367 C8.319,2.038,7.863,3.033,8.04,4C9.013,4.03,10.019,3.449,10.604,2.699L10.604,2.699z" />
    </g>
  </svg>
)

const WindowsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3" viewBox="0 0 32 32">
    <title>microsoft</title>
    <g fill="currentColor">
      <rect x="1" y="1" fill="currentColor" width="14" height="14" />
      <rect x="17" y="1" width="14" height="14" />
      <rect x="1" y="17" width="14" height="14" />
      <rect x="17" y="17" fill="currentColor" width="14" height="14" />
    </g>
  </svg>
)

const LinuxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6" viewBox="0 0 48 48">
    <title>linux</title>
    <g>
      <path
        d="M22.625,10.125c2.031-.472,5.813,2.937,7.937,6.75a41.774,41.774,0,0,1,4,12.625c.438,3.125,1.313,9.981-.812,11.553S26.592,43.5,23.233,43.562s-7.671-.124-9.171-4.374-1.937-7.626-1.374-10.438S16,20.938,17,19.5s1.029-1.266,1.4-3.688S20.329,10.658,22.625,10.125Z"
        fill="#fff"
      />
      <path
        d="M17.9,45.428c2.851-1.371,8.879-1.227,12.993,0s1.876-11.78.343-8.21a8.618,8.618,0,0,1-7.832,5.323c-6.6,0-8.68-4.728-8.68-4.728Z"
        fill="#020204"
      />
      <path
        d="M31.451,46.523c1.746,1.165,3.7-.048,4.715-1.034a14.146,14.146,0,0,1,3.586-2.671,8.842,8.842,0,0,0,3.2-2.021c.385-.65.336-1.4-.674-1.973a4.614,4.614,0,0,1-2.334-2.406c-.217-.963-.024-1.853-.77-2.431s-4.278-.605-5.293-.649-2.527-.385-2.96,0-.192,1.877-.168,2.7a44.208,44.208,0,0,1-.361,4.908C30.223,41.879,28.924,44.839,31.451,46.523Z"
        fill="#f5bd0c"
      />
      <path
        d="M17.8,16.411V7.659A6.659,6.659,0,0,1,24.455,1h0a6.659,6.659,0,0,1,6.659,6.659v6.009c0,2.166,2.779,5.017,4.583,7a16.048,16.048,0,0,1,3.537,8.3c.253,2.743-.191,5.9-2.526,6.965-2.057.939-4.067-.139-3.966-2.7.034-.847.393-5.523-.762-8.88a96.12,96.12,0,0,0-4.574-9.757s-8.275-1.72-8.275.337A8.88,8.88,0,0,1,17.8,20.742c-1.552,2.779-4.548,7.724-4.151,11.73,1.251,1.861,3.429,3.182,4.331,3.9s1.588,2.055,1.047,2.849-3.1.252-3.862,0S10.9,34.06,10.469,33.266a4.261,4.261,0,0,1-.036-3.429c.506-1.408,1.769-3.248,2.346-4.981a19.872,19.872,0,0,1,2.779-5.125C16.749,18.071,17.507,17.927,17.8,16.411Z"
        fill="#020204"
      />
      <ellipse cx="25.64" cy="10.444" rx="2.178" ry="3.116" fill="#fff" />
      <path
        d="M21.86,10.292c.121,1.447-.592,2.687-1.594,2.771s-1.728-1.034-1.849-2.481.409-2.674,1.41-2.758S21.738,8.845,21.86,10.292Z"
        fill="#fff"
      />
      <ellipse
        cx="25.64"
        cy="10.66"
        rx="1.498"
        ry="1.057"
        transform="translate(14.045 35.891) rotate(-87.895)"
        fill="#020204"
      />
      <ellipse
        cx="20.136"
        cy="10.735"
        rx="0.938"
        ry="1.353"
        transform="translate(-1.442 3.313) rotate(-9.083)"
        fill="#020204"
      />
      <path
        d="M22.62,11.009c1.3,0,2.442,1.041,3.134,1.233s1.678.283,2.063,1-.1,1.636-1.155,2.165-2.334,2.022-4.234,2.022-2.6-1.732-3.3-2.286a1.166,1.166,0,0,1-.362-1.757C19.185,12.675,21.2,11.009,22.62,11.009Z"
        fill="#f5bd0c"
      />
      <path
        d="M18.77,45.585c1.2-1.955.409-3.754-.914-5.269a65.39,65.39,0,0,1-4.018-6.184c-.65-.987-1.54-1.877-2.43-1.733s-1.516,1.757-2.094,2.238-2.791.048-3.464.77-.048,3.3-.169,4.524-.77,1.876-.842,2.454.12,1.227,1.2,1.612,5.125,1.4,6.521,1.708S17.231,48.087,18.77,45.585Z"
        fill="#f5bd0c"
      />
    </g>
  </svg>
)

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    width="16"
  >
    <path
      className="-translate-y-0.5 group-hover:translate-y-0 transition"
      d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
    />
    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
  </svg>
)

const BeakerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5"
  >
    <path
      fillRule="evenodd"
      d="M10.5 3.798v5.02a3 3 0 01-.879 2.121l-2.377 2.377a9.845 9.845 0 015.091 1.013 8.315 8.315 0 005.713.636l.285-.071-3.954-3.955a3 3 0 01-.879-2.121v-5.02a23.614 23.614 0 00-3 0zm4.5.138a.75.75 0 00.093-1.495A24.837 24.837 0 0012 2.25a25.048 25.048 0 00-3.093.191A.75.75 0 009 3.936v4.882a1.5 1.5 0 01-.44 1.06l-6.293 6.294c-1.62 1.621-.903 4.475 1.471 4.88 2.686.46 5.447.698 8.262.698 2.816 0 5.576-.239 8.262-.697 2.373-.406 3.092-3.26 1.47-4.881L15.44 9.879A1.5 1.5 0 0115 8.818V3.936z"
      clipRule="evenodd"
    />
  </svg>
)
