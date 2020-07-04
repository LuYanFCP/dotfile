#!/usr/bin/env bash

set -e

usage()
{
    echo "Usage: bash ./setup.sh [--install| --uninstall]"
}

help()
{
    usage
    echo "---------------------------------"
    echo "setup dotfile! install or uninstall"
    echo 
    echo "--install install dotfile in this user"
    echo "--uninstall uninstall dotfile in this user"
    echo "More information: https://github.com/LuYanFCP/dotfile"

}

install()
{
    
}


case "$1" in 
    "--usage")
        usage
        ;;
    "--help")
        help
        ;;
    "--install")
        install
        ;;
    "--uninstall")
        uninstall
        ;;
    *)
        echo "error unknown parameter $1"
        usage
        exit 1
        ;;
esac
