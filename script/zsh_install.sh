#!/usr/bin/env bash


# install zsh
sudo apt-get install -y zsh
# install oh-my-zsh
# 容易超时
# sh -c "$(wget -O- https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
sh resource/oh-my-zsh.sh

download_plugin()
{
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
    git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
}

download_plugin # 下载
cp resource/.zshrc ~/.zshrc