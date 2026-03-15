import sys
import os

def main():
    if len(sys.argv) < 3:
        print("Usage: python run_unoconvert.py <input> <output> [convert_to]")
        sys.exit(1)
        
    inpath = sys.argv[1]
    outpath = sys.argv[2]
    convert_to = sys.argv[3] if len(sys.argv) > 3 else None
    
    try:
        from unoserver.converter import UnoConverter
        print(f"Connecting to UnoServer to convert {inpath} -> {outpath}")
        
        converter = UnoConverter(interface="127.0.0.1", port=2002)
        converter.convert(inpath=inpath, outpath=outpath, convert_to=convert_to)
        
        print(f"Conversion complete: {outpath}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
