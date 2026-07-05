export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className="w-8 h-8 rounded-full border-4 border-[#F3F4F6] border-t-[#F5C842] animate-spin"
        role="status"
        aria-label="Carregando"
      />
    </div>
  )
}
