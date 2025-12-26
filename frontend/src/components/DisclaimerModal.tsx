import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const STORAGE_KEY = 'disclaimer_accepted'

export function DisclaimerModal() {
  const [open, setOpen] = useState(() => {
    // Check if disclaimer was already accepted
    const isAccepted = localStorage.getItem(STORAGE_KEY) === 'true'
    return !isAccepted
  })
  const [accepted, setAccepted] = useState(false)

  const handleConfirm = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  // Prevent closing by backdrop or escape by passing a no-op
  const handleClose = () => {
    // Do nothing - user must accept
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <h2>Warning / Внимание</h2>
          </div>
          
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-900 dark:bg-red-900/20 dark:text-red-200">
            <p className="mb-2 font-bold">English:</p>
            <p className="mb-4 leading-relaxed">
              All messages of connected telegram accounts are visible after agent runs. Do not connect your personal account to this app unless you want to share some secrets with the developer.
              <br />
              <strong>Connect only freshly created or work related accounts.</strong>
            </p>
            <div className="my-3 h-px bg-red-200 dark:bg-red-800" />
            <p className="mb-2 font-bold">Russian:</p>
            <p className="leading-relaxed">
              Все сообщения подключенных телеграм-аккаунтов становятся видимыми после запуска агента. Не подключайте свой личный аккаунт к этому приложению, если не хотите поделиться секретами с разработчиком.
              <br />
              <strong>Подключайте только новые или рабочие аккаунты.</strong>
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 rounded-md border border-[var(--color-border)] p-3">
           <input
            type="checkbox"
            id="accept-disclaimer"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="accept-disclaimer" className="cursor-pointer text-sm text-[var(--color-text-secondary)]">
            I understand the risks and agree to proceed <br/>
            <span className="opacity-70">Я понимаю риски и согласен продолжить</span>
          </label>
        </div>

        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          disabled={!accepted}
          onClick={handleConfirm}
        >
          Confirm / Подтвердить
        </Button>
      </div>
    </Modal>
  )
}
