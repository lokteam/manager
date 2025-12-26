import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface TelegramHelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function TelegramHelpModal({ open, onClose }: TelegramHelpModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How to get API ID & Hash"
      className="max-w-xl"
    >
      <div className="space-y-4 text-sm leading-relaxed">
        <ol className="list-decimal space-y-3 pl-4">
          <li>
            <span className="font-medium">Sign up for Telegram</span> using an
            official application (mobile or desktop).
          </li>
          <li>
            Log in to your{" "}
            <a
              href="https://my.telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Telegram core
            </a>
          </li>
          <li>
            Go to{" "}
            <span className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              <a href="https://my.telegram.org/apps">API development tools</a>
            </span>{" "}
            and fill out the form.
          </li>
        </ol>

        <div className="rounded-md bg-blue-50 p-4 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
          <p className="mb-2 font-bold">Important Configuration:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <span className="font-semibold">App name</span> and{" "}
              <span className="font-semibold">Short name</span>: Can be anything
              you like.
            </li>
            <li>
              <span className="font-semibold">Platform</span>: Select{" "}
              <span className="font-bold">Web</span>.
            </li>
            <li>
              <span className="font-semibold">URL</span>: Must be exactly{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-blue-800 dark:bg-blue-900/40 dark:text-blue-100">
                http://111.111.111.111
              </code>
            </li>
          </ul>
        </div>

        <p>
          After submitting, you will get the{" "}
          <span className="font-mono font-bold">api_id</span> and{" "}
          <span className="font-mono font-bold">api_hash</span> parameters
          required for authorization.
        </p>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Got it</Button>
        </div>
      </div>
    </Modal>
  );
}
