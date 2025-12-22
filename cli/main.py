import typer
import subprocess
import os
from .telegram import app as telegram_app
from .agents import app as agents_app

app = typer.Typer()

app.add_typer(telegram_app, name="telegram")
app.add_typer(agents_app, name="agents")


@app.command()
def backend():
  """Run the FastAPI backend server."""
  typer.echo("Starting backend server...")
  subprocess.run(
    [
      "uv",
      "run",
      "uvicorn",
      "backend.main:app",
      "--reload",
      "--host",
      "0.0.0.0",
      "--port",
      "8000",
      "--app-dir",
      "backend/src",
    ]
  )


@app.command()
def frontend():
  """Run the frontend development server."""
  frontend_dir = os.path.join(os.getcwd(), "frontend")
  if not os.path.exists(os.path.join(frontend_dir, "package.json")):
    typer.echo("Frontend not initialized yet (no package.json found in frontend/)")
    raise typer.Exit(code=1)

  typer.echo("Starting frontend server...")
  subprocess.run(["npm", "run", "dev"], cwd=frontend_dir)


def main():
  app()


if __name__ == "__main__":
  main()
