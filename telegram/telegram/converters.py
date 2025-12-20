from telethon.tl import custom as teletypes
from shared.models import DialogType, PeerType


def extract_dialog_type(dialog: teletypes.Dialog) -> DialogType:
    if dialog.is_user:
        return DialogType.USER
    if dialog.is_group:
        return DialogType.GROUP
    if dialog.is_channel:
        return DialogType.CHANNEL
    raise ValueError(f"Unknown dialog type for {dialog}")


def extract_peer_type(message: teletypes.Message) -> PeerType:
    id_ = message.from_id
    if id_ is None:
        id_ = message.peer_id

    id_dict = id_.__dict__
    if id_dict.get("user_id") is not None:
        return PeerType.USER
    if id_dict.get("chat_id") is not None:
        return PeerType.CHAT
    if id_dict.get("channel_id") is not None:
        return PeerType.CHANNEL
    raise ValueError(f"Unknown peer type for {message}")


def extract_peer_id(message: teletypes.Message) -> int:
    id_ = message.from_id
    if id_ is None:
        id_ = message.peer_id

    # The original logic was a bit strange with the loop and early return
    # I will try to preserve it but make it cleaner
    id_dict = id_.__dict__
    if id_dict.get("channel_id") is not None:
        return int("-100" + str(id_dict.get("channel_id")))

    for val in id_dict.values():
        if val is not None:
            return val

    raise ValueError(f"Could not extract peer id from {message}")
