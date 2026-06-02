interface HeaderTitleProps {
  title: string
  large?: boolean
}

export default function HeaderTitle({ title, large = false }: HeaderTitleProps) {
  return (
    <h1
      className={
        large
          ? 'fixed right-[-0.4375rem] top-[-0.9375rem] z-chrome font-heading text-[3.75rem] font-black uppercase leading-none opacity-60 animate-[colorChange_6s_ease-in-out_infinite] s:right-[-0.625rem] s:top-[-1.0625rem] s:text-[5rem] m:right-[-0.8125rem] m:top-[-1.8125rem] m:text-[6.875rem] l:right-[-1.375rem] l:top-[-2.5rem] l:text-[9.375rem]'
          : 'fixed right-[-1.875rem] top-[-1.875rem] z-chrome font-title text-[7.5rem] font-black uppercase leading-none opacity-60 animate-[colorChange_6s_ease-in-out_infinite] s:text-[9.375rem] m:text-[11.25rem] l:right-[-4.375rem] l:top-[-3.75rem] l:text-[13.75rem]'
      }
    >
      {title}
    </h1>
  )
}
