import sys
import os

# Ensure we're running with the LibreOffice python
def main():
    try:
        from unoserver.server import UnoServer
        print("Starting UnoServer...")
        
        # We start it on the default port 2002
        # LibreOffice executable is automatically found by unoserver
        server = UnoServer(interface="127.0.0.1", port=2002)
        server.start()
        print("UnoServer stopped.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
