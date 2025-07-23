import Image from "next/image"

interface CollegeHeaderProps {
  title: string
  subtitle?: string
}

export function CollegeHeader({ title, subtitle }: CollegeHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-green-600 to-yellow-500 text-white py-8 px-4">
      <div className="container mx-auto flex items-center justify-center gap-6">
        <div className="flex-shrink-0">
          <Image
            src="/logo-colegio.png"
            alt="Logo E.E.S.T. Nº 6 Banfield"
            width={80}
            height={80}
            className="rounded-lg shadow-lg bg-white p-2"
          />
        </div>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
          <p className="text-lg md:text-xl opacity-90 mb-1">E.E.S.T. Nº 6 BANFIELD</p>
          <p className="text-base md:text-lg opacity-80">LOMAS DE ZAMORA</p>
          {subtitle && <p className="text-sm md:text-base opacity-75 mt-2">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
